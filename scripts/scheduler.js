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
import { instruments } from './instruments.js';
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
 * Schedules audio for all voices across all lanes at a given master step.
 * Uses state.lastScheduledActive for dedup so consecutive master steps that
 * map to the same phrase/wheel step only fire once.
 */
function scheduleStepAudio(state, lanes, channels, stepIndex, hitTime, globalVolume) {
    const lsa = state.lastScheduledActive;
    const stepWithinPhrase = stepIndex % state.masterPhraseSteps;

    if (stepWithinPhrase !== lsa.master) {
        lanes.master.voices.forEach((voice, vi) => {
            if (voice.selected[stepWithinPhrase]) {
                const ch = channels.masterVoices[vi];
                if (ch) playSingleChannel(state, ch, globalVolume, hitTime);
            }
        });
        lsa.master = stepWithinPhrase;
    }

    const aps = getActivePhraseStep(stepIndex, state.phaseA, state.teethA, state.phraseStepsA);
    if (aps !== lsa.Aphrase) {
        lanes.Aphrase.voices.forEach((voice, vi) => {
            if (voice.selected[aps]) {
                const ch = channels.Avoices[vi];
                if (ch) playSingleChannel(state, ch, globalVolume, hitTime);
            }
        });
        lsa.Aphrase = aps;
    }

    if (lanes.Awheel.selected[((stepIndex % state.mainTeeth) + state.mainTeeth) % state.mainTeeth]) {
        if (channels.Awheel) playSingleChannel(state, channels.Awheel, globalVolume, hitTime);
    }

    const bps = getActivePhraseStep(stepIndex, state.phaseB, state.teethB, state.phraseStepsB);
    if (bps !== lsa.Bphrase) {
        lanes.Bphrase.voices.forEach((voice, vi) => {
            if (voice.selected[bps]) {
                const ch = channels.Bvoices[vi];
                if (ch) playSingleChannel(state, ch, globalVolume, hitTime);
            }
        });
        lsa.Bphrase = bps;
    }

    if (lanes.Bwheel.selected[((stepIndex % state.mainTeeth) + state.mainTeeth) % state.mainTeeth]) {
        if (channels.Bwheel) playSingleChannel(state, channels.Bwheel, globalVolume, hitTime);
    }
}


let _schedulerTimer = null;

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
    const lookahead = 0.05;
    state.lastScheduledStep = Math.floor((elapsed + lookahead) / stepDuration);
    state.lastScheduledQuarter = Math.floor((elapsed + lookahead) / quarterDuration);
    state.lastScheduledActive = { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 };


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
        const lookahead = 0.05;
        const targetStep = Math.floor((elapsed + lookahead) / stepDuration);
        const targetQuarter = Math.floor((elapsed + lookahead) / quarterDuration);
        const globalVolume = currentGlobalVolume();

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
        state.lastScheduledActive = { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 };
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

    const fn = instruments[channel.sound];
    if (!fn) return;

    const now = hitTime
        ? Math.max(hitTime, state.audioCtx.currentTime + 0.025)
        : state.audioCtx.currentTime;
    try { fn(state, now, vol, channel.prefix || ''); }
    catch (err) { console.error('Instrument error:', err, 'for sound', channel.sound); }
}
