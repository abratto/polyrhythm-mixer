/**
 * scheduler.js — Audio timing loop, step scheduling, and sound playout.
 *
 *   syncAudioStartTime    — re-anchor the audio clock after tempo/reset changes
 *   scheduleStepAudio     — per-step trigger dispatch (called from the tick loop)
 *   startAudioScheduler   — self-adjusting setTimeout loop pre-scheduling future
 *                           steps at precise audio-clock hitTimes
 *   stopAudioScheduler    — clear the timer
 *   resetAudioScheduler   — reset tracking so only future steps fire
 *
 *   playSingleChannel     — apply mute/solo/volume, then call into instruments.js
 *   _updateSoloFlag       — cache the global solo state for fast per-trigger checks
 */

import { getActivePhraseStep } from './math.js';
import { triggerInstrument } from './instruments.js';
import { isAnyChannelSoloed } from './channels.js';

/**
 * Re-anchors the audio clock reference so derived angle remains continuous
 * across tempo changes, system resets, and share restores.
 * No-op when audioClockActive is false or audioCtx is null.
 */
export function syncAudioStartTime(state) {
    if (state.audioClockActive && state.audioCtx) {
        const rps = state.tempo * Math.PI / 120;
        state.audioStartTime = state.audioCtx.currentTime - state.mainAngle / rps;
    }
}

/**
 * True when `stepIndex` lands on a grouping-lane onset: the grouping start
 * recurs every `groupSize` master steps, offset by `phase`. Testing the onset
 * (rather than a change in the active step) is what makes a single-group lane
 * — whose active step is always 0 — still fire once per cycle.
 */
export function isGroupOnset(stepIndex, phase, groupSize) {
    if (!(groupSize >= 1)) return false;
    return ((stepIndex - phase) % groupSize) === 0;
}

/**
 * Schedules audio for all voices across all lanes at a given master step.
 * `state.lastScheduledActive.master` dedups the master lane so consecutive
 * master steps that map to the same phrase step only fire once.
 */
function scheduleStepAudio(state, lanes, channels, stepIndex, hitTime, globalVolume) {
    const lsa = state.lastScheduledActive;

    // Master lane. When pinned (followPlayhead === false) the lane locks onto the
    // single visible cycle and loops it continuously — its active step is anchored
    // inside that cycle and wraps within it every `mainTeeth` master steps, so the
    // segment repeats regardless of where the master playhead is. When not pinned
    // it tracks the master playhead as before.
    const stepWithinPhrase = stepIndex % state.masterPhraseSteps;
    let masterStep = stepWithinPhrase;
    if (state.followPlayhead.master === false) {
        masterStep = state.visibleCycle.master * state.mainTeeth + (stepIndex % state.mainTeeth);
    }
    if (masterStep !== lsa.master) {
        lanes.master.voices.forEach((voice, vi) => {
            if (voice.selected[masterStep]) {
                const ch = channels.masterVoices[vi];
                if (ch) playSingleChannel(state, ch, globalVolume, hitTime);
            }
        });
        lsa.master = masterStep;
    }

    // Grouping lanes — fire only on a group onset (stepIndex ≡ phase mod
    // groupSize). Detecting the onset rather than a change in the active step
    // is what lets a single-group lane (whose active step is always 0) fire
    // once per cycle. Pinned lanes loop their visible cycle.
    for (const lane of (lanes.grouping || [])) {
        const groupSize = state.mainTeeth / lane.groupCount;
        if (!isGroupOnset(stepIndex, lane.phase || 0, groupSize)) continue;
        const active = getActivePhraseStep(stepIndex, lane.phase || 0, groupSize, lane.count());
        let step = active;
        if (state.followPlayhead[lane.cycleKey] === false) {
            step = state.visibleCycle[lane.cycleKey] * lane.groupCount + (active % lane.groupCount);
        }
        lane.voices.forEach((voice, vi) => {
            if (!voice.selected[step]) return;
            const ch = lane.voiceChannels[vi];
            if (ch) playSingleChannel(state, ch, globalVolume, hitTime);
        });
    }

    if (lanes.Awheel.selected[((stepIndex % state.mainTeeth) + state.mainTeeth) % state.mainTeeth]) {
        if (channels.Awheel) playSingleChannel(state, channels.Awheel, globalVolume, hitTime);
    }

    if (lanes.Bwheel.selected[((stepIndex % state.mainTeeth) + state.mainTeeth) % state.mainTeeth]) {
        if (channels.Bwheel) playSingleChannel(state, channels.Bwheel, globalVolume, hitTime);
    }
}


let _schedulerTimer = null;

// Scheduling horizon: hits are pre-scheduled this far ahead, so a main-thread
// stall shorter than this is already committed to the audio graph and still
// plays on time. Larger = more resilient to jank. Taps don't preview audio
// (only the scheduler triggers sounds), so this adds no tap-feedback latency —
// it only means pattern/volume edits are heard up to this much later.
const LOOKAHEAD_SECONDS = 0.12;

// Reseed (drop the missed steps) only when a stall exceeds this. Time-based so
// the behaviour is consistent across meters and tempos — a fixed step count is
// ~150ms at dense meters but ~1.8s at sparse ones.
const MAX_CATCH_UP_SECONDS = 0.25;

/**
 * Self-adjusting audio scheduling loop. Runs independently of rAF,
 * pre-scheduling sounds at precise hitTimes from the audio clock.
 * Wakes up 3ms before the next step or quarter boundary.
 */
export function startAudioScheduler(state, lanes, channels, globalVolumeSource) {
    if (_schedulerTimer) return;

    const currentGlobalVolume = () => typeof globalVolumeSource === 'function'
        ? globalVolumeSource()
        : globalVolumeSource;

    // Seed tracking to current position so only future steps fire
    const rps = state.tempo * Math.PI / 120;
    const stepSize = 2 * Math.PI / state.mainTeeth;
    const stepDuration = stepSize / rps;
    const quarterDuration = 60 / state.tempo;
    const elapsed = state.audioCtx.currentTime - state.audioStartTime;
    state.lastScheduledStep = Math.floor((elapsed + LOOKAHEAD_SECONDS) / stepDuration);
    state.lastScheduledQuarter = Math.floor((elapsed + LOOKAHEAD_SECONDS) / quarterDuration);
    state.lastScheduledActive = { master: -1 };


    // Cache scheduler timing values; only recalc when tempo or teeth change
    let _cachedTempo = 0;
    let _cachedMainTeeth = 0;
    let _cachedRps = 0;
    let _cachedStepDuration = 0;
    let _cachedQuarterDuration = 0;

    function _refreshTiming() {
        if (_cachedTempo !== state.tempo || _cachedMainTeeth !== state.mainTeeth) {
            _cachedTempo = state.tempo;
            _cachedMainTeeth = state.mainTeeth;
            _cachedRps = state.tempo * Math.PI / 120;
            _cachedStepDuration = (2 * Math.PI / state.mainTeeth) / _cachedRps;
            _cachedQuarterDuration = 60 / state.tempo;
        }
    }

    function tick() {
        if (!state.audioClockActive || !state.audioCtx || !state.playing) {
            _schedulerTimer = null;
            return;
        }
        _updateSoloFlag(channels);
        _refreshTiming();

        const stepDuration = _cachedStepDuration;
        const quarterDuration = _cachedQuarterDuration;

        const now = state.audioCtx.currentTime;
        const elapsed = now - state.audioStartTime;
        const targetStep = Math.floor((elapsed + LOOKAHEAD_SECONDS) / stepDuration);
        const targetQuarter = Math.floor((elapsed + LOOKAHEAD_SECONDS) / quarterDuration);
        const globalVolume = currentGlobalVolume();

        // A throttled tab or a long main-thread stall can leave many expired
        // events behind. Resume from the current clock position instead of
        // collapsing every missed hit into an audible burst. Stalls shorter
        // than the lookahead are already pre-scheduled, so this only trips on
        // genuinely large gaps.
        const catchUpSteps = targetStep - state.lastScheduledStep;
        if (catchUpSteps > 0 && catchUpSteps * stepDuration > MAX_CATCH_UP_SECONDS) {
            state.lastScheduledStep = targetStep;
            state.lastScheduledQuarter = targetQuarter;
            state.lastScheduledActive = { master: -1 };
        }

        for (let s = state.lastScheduledStep + 1; s <= targetStep; s++) {
            const hitTime = state.audioStartTime + s * stepDuration;
            scheduleStepAudio(state, lanes, channels, s, hitTime, globalVolume);
        }
        state.lastScheduledStep = Math.max(state.lastScheduledStep, targetStep);

        for (let q = state.lastScheduledQuarter + 1; q <= targetQuarter; q++) {
            const hitTime = state.audioStartTime + q * quarterDuration;
            if (channels.driver) playSingleChannel(state, channels.driver, globalVolume, hitTime);
        }
        state.lastScheduledQuarter = Math.max(state.lastScheduledQuarter, targetQuarter);

        const nextStep = state.audioStartTime + (state.lastScheduledStep + 1) * stepDuration;
        const nextQuarter = state.audioStartTime + (state.lastScheduledQuarter + 1) * quarterDuration;
        const nextBoundary = Math.min(nextStep, nextQuarter);
        const delay = (nextBoundary - now) * 1000 - 3;
        const boundedDelay = Math.max(5, Math.min(delay, 20));

        _schedulerTimer = setTimeout(tick, boundedDelay);
    }

    tick();
}

/** Stops the audio scheduler and clears its timer. */
export function stopAudioScheduler() {
    if (_schedulerTimer) {
        clearTimeout(_schedulerTimer);
        _schedulerTimer = null;
    }
}

/** Resets scheduler tracking to the current position so only future steps fire. */
export function resetAudioScheduler(state) {
    if (state.audioClockActive && state.audioCtx) {
        const rps = state.tempo * Math.PI / 120;
        const stepSize = 2 * Math.PI / state.mainTeeth;
        const stepDuration = stepSize / rps;
        const quarterDuration = 60 / state.tempo;
        const elapsed = state.audioCtx.currentTime - state.audioStartTime;
        state.lastScheduledStep = Math.floor(elapsed / stepDuration);
        state.lastScheduledQuarter = Math.floor(elapsed / quarterDuration);
        state.lastScheduledActive = { master: -1 };
    }
}

/** Cached solo flag — set before each batch of sound scheduling, read by playSingleChannel. */
let _soloActive = false;
function _updateSoloFlag(channels) {
    _soloActive = isAnyChannelSoloed(channels);
}

/**
 * Plays the sound for a given channel. Applies the channel's volume,
 * mute state, gain scale, and the global volume multiplier.
 * Respects solo: if any channel is soloed, only soloed channels play.
 */
/** Plays a sound for a single channel if not muted. Uses a 25ms lookahead floor for audio thread prep. */
export function playSingleChannel(state, channel, globalVolume, hitTime) {
    if (!channel || channel.muted) return;
    if (!channel.sound) return;
    if (_soloActive && !channel.soloed) return;

    const vol = channel.volume * channel.gainScale * globalVolume;
    if (vol <= 0) return;

    const now = hitTime
        ? Math.max(hitTime, state.audioCtx.currentTime + 0.025)
        : state.audioCtx.currentTime;
    try { triggerInstrument(state, channel.sound, now, vol, channel.prefix || ''); }
    catch (err) { console.error('Instrument error:', err, 'for sound', channel.sound); }
}
