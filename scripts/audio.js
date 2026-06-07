/**
 * audio.js — Web Audio instrument synthesis and channel management.
 *
 * Defines a catalog of percussion instruments synthesized in real-time using
 * oscillators, noise buffers, and filters. Each instrument is a function that
 * receives the audio context, scheduling time, volume, and channel name.
 *
 * Channels (driver, custom, A, Awheel, B, Bwheel) each have their own sound
 * selection, volume fader, and mute toggle.
 */

import { getActivePhraseStep, getActiveWheelStep } from './math.js';

/**
 * Available percussion instruments, sorted alphabetically by display label.
 * Each entry maps a short value key (used in serialization) to a human-readable label.
 */
export const instrumentCatalog = [
    { value: 'agogo', label: 'Agogo Bell Accent' },
    { value: 'cowbell', label: 'Analog Cowbell' },
    { value: 'bata_low', label: 'Batá Drum (Low)' },
    { value: 'bata_middle', label: 'Batá Drum (Middle)' },
    { value: 'bata_high', label: 'Batá Drum (High)' },
    { value: 'bata_slap', label: 'Batá Slap' },
    { value: 'kick', label: 'Bass Drum (Kick)' },
    { value: 'bongo_high', label: 'Bongo (High)' },
    { value: 'bongo_low', label: 'Bongo (Low)' },
    { value: 'castanets', label: 'Castanets' },
    { value: 'cabasa_shekere', label: 'Cabasa / Shekere' },
    { value: 'claves', label: 'Claves' },
    { value: 'cl_hihat', label: 'Closed Hi-Hat' },
    { value: 'conga_high', label: 'Conga (High)' },
    { value: 'conga_low', label: 'Conga (Low)' },
    { value: 'conga_middle', label: 'Conga (Middle)' },
    { value: 'conga_slap', label: 'Conga Slap' },
    { value: 'cajon_bass', label: 'Cajón Bass' },
    { value: 'cajon_slap', label: 'Cajón Slap' },
    { value: 'crash', label: 'Crash Cymbal' },
    { value: 'ping', label: 'Crystal High Ping' },
    { value: 'synth_kick', label: 'EDM Synth Kick' },
    { value: 'electronic_snare', label: 'Electronic Snare' },
    { value: 'foot_tap', label: 'Foot Tap' },
    { value: 'djembe', label: 'Frame Drum / Djembe' },
    { value: 'gankogui', label: 'Gankogui Double Bell' },
    { value: 'guiro', label: 'Guiro Scraper' },
    { value: 'slap', label: 'Hand Slap' },
    { value: 'clap', label: 'Handclap' },
    { value: 'maraca', label: 'Maraca' },
    { value: 'op_hihat', label: 'Open Hi-Hat' },
    { value: 'shaker', label: 'Percussion Shaker' },
    { value: 'ride', label: 'Ride Cymbal' },
    { value: 'rimshot', label: 'Rimshot Click' },
    { value: 'snare', label: 'Snare Drum' },
    { value: 'tom', label: 'Synth Electronic Tom' },
    { value: 'tambourine', label: 'Tambourine' },
    { value: 'talking_drum', label: 'Talking Drum' },
    { value: 'temple_block', label: 'Temple Block' },
    { value: 'timbale', label: 'Timbale' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'udu', label: 'Udu Clay Pot' },
    { value: 'woodblock', label: 'Woodblock Clack' }
];

/**
 * Creates channel objects that hold the state and DOM references for each
 * audio lane. Fixed channels (driver, Awheel, Bwheel) have static
 * DOM elements. Multi-voice channels (master, A, B) have dynamic voice arrays.
 */
export function createChannels() {
    return {
        driver: {
            soundEl: document.getElementById('soundDriver'),
            volEl: document.getElementById('volDriver'),
            muteEl: document.getElementById('muteDriver'),
            sound: 'shaker',
            volume: 0.6,
            muted: false,
            gainScale: 0.6
        },
        Awheel: {
            soundEl: document.getElementById('soundAWheel'),
            volEl: document.getElementById('volAWheel'),
            muteEl: document.getElementById('muteAWheel'),
            sound: 'shaker',
            volume: 0.45,
            muted: false,
            gainScale: 0.5
        },
        Bwheel: {
            soundEl: document.getElementById('soundBWheel'),
            volEl: document.getElementById('volBWheel'),
            muteEl: document.getElementById('muteBWheel'),
            sound: 'shaker',
            volume: 0.35,
            muted: false,
            gainScale: 0.4
        },
        // Multi-voice channels — populated dynamically
        masterVoices: [],
        Avoices: [],
        Bvoices: []
    };
}

/** Creates a single voice channel object with DOM refs and state. */
export function createVoiceChannel(container, voiceIndex, prefix, defaults, gainScale) {
    const id = `${prefix}_${voiceIndex}`;
    const soundEl = document.getElementById(`sound_${id}`);
    const volEl = document.getElementById(`vol_${id}`);
    const muteEl = document.getElementById(`mute_${id}`);

    const channel = {
        soundEl,
        volEl,
        muteEl,
        sound: defaults[prefix] || 'kick', // cached instrument value
        volume: 0.5,
        muted: false,
        gainScale,
        voiceIndex,
        prefix,
        onInstrumentChange: null
    };

    // Populate sound selector
    if (soundEl) {
        soundEl.innerHTML = '';
        instrumentCatalog.forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst.value;
            opt.textContent = inst.label;
            if (inst.value === defaults[prefix]) opt.selected = true;
            soundEl.appendChild(opt);
        });
        // Cache instrument changes
        soundEl.addEventListener('change', () => {
            channel.sound = soundEl.value;
            if (channel.onInstrumentChange) channel.onInstrumentChange(channel);
        });
    }

    return channel;
}

/** Default instruments for each voice channel prefix. */
const voiceDefaults = {
    master: 'kick',
    A: 'woodblock',
    B: 'cowbell'
};

/** Adds a new voice channel to a multi-voice group. */
export function addVoiceChannel(channels, prefix, container, voiceIndex) {
    try {
        const gainScale = prefix === 'master' ? 0.6 : prefix === 'A' ? 0.5 : 0.4;
        const channel = createVoiceChannel(container, voiceIndex, prefix, voiceDefaults, gainScale);
        const key = prefix === 'master' ? 'masterVoices' : prefix === 'A' ? 'Avoices' : 'Bvoices';
        if (!channels[key]) channels[key] = [];
        channels[key].push(channel);

        // Wire volume and mute handlers
        if (channel.volEl) {
            channel.volEl.addEventListener('input', () => {
                channel.volume = parseFloat(channel.volEl.value);
            });
        }
        if (channel.muteEl) {
            channel.muteEl.addEventListener('click', () => {
                channel.muted = !channel.muted;
                channel.muteEl.classList.toggle('muted', channel.muted);
                channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
            });
        }

        return channel;
    } catch (err) {
        console.error(`addVoiceChannel failed for ${prefix}_${voiceIndex}:`, err);
        return null;
    }
}

/** Removes a voice channel from a multi-voice group. */
export function removeVoiceChannel(channels, prefix, voiceIndex) {
    const key = prefix === 'master' ? 'masterVoices' : prefix === 'A' ? 'Avoices' : 'Bvoices';
    const voiceArray = channels[key];
    if (!voiceArray || voiceArray.length <= 1) return;

    // Remove DOM elements
    const channel = voiceArray[voiceIndex];
    const stripEl = document.getElementById(`strip_${prefix}_${voiceIndex}`);
    if (stripEl) stripEl.remove();

    voiceArray.splice(voiceIndex, 1);
}

/**
 * Populates each fixed channel's sound selector dropdown with the instrument catalog.
 * Sets the default instrument for each channel.
 */
export function populateMenus(channels) {
    const defaults = {
        driver: 'shaker',
        Awheel: 'shaker',
        Bwheel: 'shaker'
    };

    const fixedChannels = ['driver', 'Awheel', 'Bwheel'];
    fixedChannels.forEach(name => {
        const channel = channels[name];
        if (!channel || !channel.soundEl) return;
        channel.soundEl.innerHTML = '';
        instrumentCatalog.forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst.value;
            opt.textContent = inst.label;
            if (inst.value === defaults[name]) opt.selected = true;
            channel.soundEl.appendChild(opt);
        });
    });
}

/** Attaches input/click handlers to each fixed channel's volume fader and mute button. */
export function wireChannels(channels) {
    const fixedChannels = ['driver', 'Awheel', 'Bwheel'];
    fixedChannels.forEach(name => {
        const channel = channels[name];
        if (!channel) return;
        channel.muteEl.classList.toggle('muted', channel.muted);
        channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';

        channel.volEl.addEventListener('input', () => {
            channel.volume = parseFloat(channel.volEl.value);
        });

        channel.muteEl.addEventListener('click', () => {
            channel.muted = !channel.muted;
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        });

        // Cache instrument changes
        channel.soundEl.addEventListener('change', () => {
            channel.sound = channel.soundEl.value;
        });
    });
}

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
    const stepWithinCycle = ((stepIndex % state.mainTeeth) + state.mainTeeth) % state.mainTeeth;

    if (stepWithinCycle !== lsa.master) {
        lanes.master.voices.forEach((voice, vi) => {
            if (voice.selected[stepWithinCycle]) {
                const ch = channels.masterVoices[vi];
                if (ch) playSingleChannel(state, ch, globalVolume, hitTime);
            }
        });
        lsa.master = stepWithinCycle;
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

    const aws = getActiveWheelStep(stepIndex, state.phaseA, state.teethA, state.A);
    if (aws !== lsa.Awheel) {
        if (lanes.Awheel.selected[aws]) {
            if (channels.Awheel) playSingleChannel(state, channels.Awheel, globalVolume, hitTime);
        }
        lsa.Awheel = aws;
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

    const bws = getActiveWheelStep(stepIndex, state.phaseB, state.teethB, state.B);
    if (bws !== lsa.Bwheel) {
        if (lanes.Bwheel.selected[bws]) {
            if (channels.Bwheel) playSingleChannel(state, channels.Bwheel, globalVolume, hitTime);
        }
        lsa.Bwheel = bws;
    }
}

let _schedulerTimer = null;

/**
 * Self-adjusting audio scheduling loop. Runs independently of rAF,
 * pre-scheduling sounds at precise hitTimes from the audio clock.
 * Wakes up 3ms before the next step or quarter boundary.
 */
export function startAudioScheduler(state, lanes, channels, globalVolume) {
    if (_schedulerTimer) return;

    // Seed tracking to current position so only future steps fire
    const rps = state.tempo * Math.PI / 120;
    const stepSize = 2 * Math.PI / state.mainTeeth;
    const stepDuration = stepSize / rps;
    const quarterDuration = 60 / state.tempo;
    const elapsed = state.audioCtx.currentTime - state.audioStartTime;
    state.lastScheduledStep = Math.floor(elapsed / stepDuration);
    state.lastScheduledQuarter = Math.floor(elapsed / quarterDuration);
    state.lastScheduledActive = { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 };

    function tick() {
        if (!state.audioClockActive || !state.audioCtx || !state.audioEnabled) {
            _schedulerTimer = null;
            return;
        }

        const rps = state.tempo * Math.PI / 120;
        const stepSize = 2 * Math.PI / state.mainTeeth;
        const stepDuration = stepSize / rps;
        const quarterDuration = 60 / state.tempo;

        const now = state.audioCtx.currentTime;
        const elapsed = now - state.audioStartTime;
        const currentStep = Math.floor(elapsed / stepDuration);
        const currentQuarter = Math.floor(elapsed / quarterDuration);

        for (let s = state.lastScheduledStep + 1; s <= currentStep; s++) {
            const hitTime = state.audioStartTime + s * stepDuration;
            scheduleStepAudio(state, lanes, channels, s, hitTime, globalVolume);
        }
        state.lastScheduledStep = Math.max(state.lastScheduledStep, currentStep);

        for (let q = state.lastScheduledQuarter + 1; q <= currentQuarter; q++) {
            const hitTime = state.audioStartTime + q * quarterDuration;
            if (channels.driver) playSingleChannel(state, channels.driver, globalVolume, hitTime);
        }
        state.lastScheduledQuarter = Math.max(state.lastScheduledQuarter, currentQuarter);

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

/**
 * Toggles audio on/off. Creates the AudioContext on first user gesture
 * (required by browser autoplay policies) and resumes it if suspended.
 */
export async function toggleAudio(state, ui) {
    try {
        if (!state.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioContextClass();
            primeNodePools(state.audioCtx);
        }
        if (state.audioCtx.state === 'suspended') {
            await state.audioCtx.resume();
        }
        state.audioEnabled = !state.audioEnabled;

        // Activate audio-clock angle derivation on first enable
        if (state.audioEnabled && !state.audioClockActive) {
            state.audioClockActive = true;
            const rps = state.tempo * Math.PI / 120;
            state.audioStartTime = state.audioCtx.currentTime - state.mainAngle / rps;
        }

        ui.audioBtn.classList.toggle('active', state.audioEnabled);
        ui.audioBtn.textContent = state.audioEnabled ? 'Disable Audio' : 'Enable Audio';
    } catch (err) {
        console.error('Audio init failed:', err);
    }
}

/**
 * Pre-generates a 1-second noise buffer that can be reused for short sounds.
 * Short sounds just start the source and let it auto-stop, so we only need
 * one buffer and create new BufferSource nodes from it.
 */
let _noiseBuffer = null;

function getNoiseSource(state) {
    if (!state.audioCtx) return null;
    if (!_noiseBuffer) {
        const duration = 1.0;
        const bufferSize = Math.floor(state.audioCtx.sampleRate * duration);
        _noiseBuffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
        const data = _noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = state.audioCtx.createBufferSource();
    source.buffer = _noiseBuffer;
    return source;
}

// ===== Instrument synthesis functions =====

/** Kick drum: sine oscillator with fast pitch sweep downward. */
function playKick(state, now, vol) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.14);
}

/** Snare: triangle oscillator body + highpass noise for snap. */
function playSnare(state, now, vol) {
    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    oscGain.gain.setValueAtTime(vol * 0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.08);

    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Closed hi-hat: short bandpass noise burst at 7.5 kHz. */
function playClosedHiHat(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(vol * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Open hi-hat: longer bandpass noise burst at 7.5 kHz. */
function playOpenHiHat(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(vol * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Shaker: bandpass noise with a quick attack envelope to simulate bead movement. */
function playShaker(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(5500, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol * 0.5, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Tom: sine oscillator with pitch sweep, frequency varies by channel (A vs B). */
function playTom(state, now, vol, channelName) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 210 : 160, now);
    osc.frequency.exponentialRampToValueAtTime(channelName.startsWith('A') ? 110 : 80, now + 0.2);
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.22);
}

/** Handclap: multiple short noise bursts followed by a longer tail through a bandpass filter. */
function playClap(state, now, vol) {
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1300, now);

    const gain = acquireGain(state);
    filter.connect(gain);
    gain.connect(state.audioCtx.destination);

    [0, 0.012, 0.024].forEach((delay) => {
        const burst = getNoiseSource(state);
        if (!burst) return;
        const burstGain = acquireGain(state);
        burstGain.gain.setValueAtTime(vol * 0.45, now + delay);
        burstGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);
        burst.connect(filter);
        filter.connect(burstGain);
        burstGain.connect(state.audioCtx.destination);
        burst.start(now + delay);
    });

    const mainClap = getNoiseSource(state);
    if (!mainClap) return;
    gain.gain.setValueAtTime(vol * 0.65, now + 0.038);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    mainClap.connect(filter);
    mainClap.start(now + 0.038);
}

/** Agogo bell: sine oscillator, pitch varies by channel. */
function playAgogo(state, now, vol, channelName) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 880 : 587, now);
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.18);
}

/** Crystal ping: high-frequency sine tone, pitch varies by channel. */
function playPing(state, now, vol, channelName) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 1400 : 950, now);
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.3);
}

/** Rimshot: short triangle oscillator click at 680 Hz. */
function playRimshot(state, now, vol) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.05);
}

/** Woodblock: sine oscillator with a brief downward pitch sweep. */
function playWoodblock(state, now, vol) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.04);
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.1);
}

/** Cowbell: two detuned square oscillators through a bandpass filter. */
function playCowbell(state, now, vol) {
    const osc1 = acquireOsc(state);
    const osc2 = acquireOsc(state);
    const gain = acquireGain(state);
    const filter = state.audioCtx.createBiquadFilter();
    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(540, now);
    osc2.frequency.setValueAtTime(800, now);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + 0.25); osc2.stop(now + 0.25);
}

/** Tambourine: bandpass noise for jingle + sine ring for body. */
function playTambourine(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(9000, now);
    noiseFilter.Q.setValueAtTime(0.7, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    oscGain.gain.setValueAtTime(vol * 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.15);
}

/** Conga low (Tumba): deep open tone with additive overtones and parabolic pitch drop. */
function playCongaLow(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 140 : 130;
    const decay = 0.2;
    const overtones = [1.5, 2.2];

    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    // Fundamental (sine for clean bottom-end warmth)
    createCongaTone(state, baseFreq, 0.7, 'sine', masterGain, now, decay, 1.2);

    // Shell overtones (triangle for woody rim ring)
    overtones.forEach((ratio, i) => {
        const partialDecay = decay * (1 - (i * 0.2));
        createCongaTone(state, baseFreq * ratio, 0.25 / (i + 1), 'triangle', masterGain, now, partialDecay, 1.1);
    });

    // Gentle palm-impact transient puff
    createCongaOpenNoise(state, masterGain, now, 0.03);
}

/** Conga middle: open tone between tumba and quinto with balanced body and brightness. */
function playCongaMiddle(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 175 : 160;
    const decay = 0.17;
    const overtones = [1.55, 2.3];

    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    createCongaTone(state, baseFreq, 0.7, 'sine', masterGain, now, decay, 1.25);

    overtones.forEach((ratio, i) => {
        const partialDecay = decay * (1 - (i * 0.2));
        createCongaTone(state, baseFreq * ratio, 0.25 / (i + 1), 'triangle', masterGain, now, partialDecay, 1.1);
    });

    createCongaOpenNoise(state, masterGain, now, 0.03);
}

/** Conga high (Quinto): bright open tone with sharper pitch drop and shorter decay. */
function playCongaHigh(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 220 : 200;
    const decay = 0.14;
    const overtones = [1.6, 2.4];

    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    // Fundamental
    createCongaTone(state, baseFreq, 0.7, 'sine', masterGain, now, decay, 1.3);

    // Shell overtones
    overtones.forEach((ratio, i) => {
        const partialDecay = decay * (1 - (i * 0.2));
        createCongaTone(state, baseFreq * ratio, 0.25 / (i + 1), 'triangle', masterGain, now, partialDecay, 1.1);
    });

    // Gentle palm-impact transient puff
    createCongaOpenNoise(state, masterGain, now, 0.03);
}

/** Conga slap: sharp high-frequency skin crack with resonant rim ring and heavy noise. */
function playCongaSlap(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 480 : 420;
    const slapFreq = baseFreq * 2.2;
    const slapDecay = 0.05;

    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + slapDecay);
    masterGain.connect(state.audioCtx.destination);

    // Sharp resonant oscillator ring for rim edge
    createCongaTone(state, slapFreq, 0.4, 'triangle', masterGain, now, slapDecay, 2.0);

    // High-frequency skin snap transient
    createCongaSlapNoise(state, masterGain, now, slapDecay);
}

/** Helper: synthesizes a tonal component with precise pitch drops for congas. */
function createCongaTone(state, freq, volume, waveType, target, startTime, duration, pitchBendFactor) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq * pitchBendFactor, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.035);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(target);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

/** Helper: generates high-frequency burst for conga slap strokes. */
function createCongaSlapNoise(state, target, startTime, duration) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, startTime);
    filter.Q.setValueAtTime(4.0, startTime);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(0.9, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    noise.start(startTime);
}

/** Helper: generates soft palm-impact air puff for conga open strokes. */
function createCongaOpenNoise(state, target, startTime, duration) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, startTime);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    noise.start(startTime);
}

/** Bongo low: short sine sweep, frequency varies by channel. */
function playBongoLow(state, now, vol, channelName) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 440 : 400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.09);
}

/** Bongo high: higher-pitched short sine sweep, frequency varies by channel. */
function playBongoHigh(state, now, vol, channelName) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 550 : 500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.07);
    gain.gain.setValueAtTime(vol * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.08);
}

/** Maraca: bandpass noise with amplitude modulation to simulate shaking. */
function playMaraca(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7000, now);
    filter.Q.setValueAtTime(2, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(0.001, now);
    for (let i = 0; i < 12; i++) {
        const t = now + i * 0.012;
        gain.gain.linearRampToValueAtTime(vol * 0.4, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.006);
    }
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Crash cymbal: full highpass noise with sustained sine wash for resonance. */
function playCrash(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(5200, now);
    oscGain.gain.setValueAtTime(vol * 0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.6);
}

/** Ride cymbal: bandpass noise ping + sustained sine bell tone. */
function playRide(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(6000, now);
    filter.Q.setValueAtTime(1.5, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(6200, now);
    oscGain.gain.setValueAtTime(vol * 0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.4);
}

/** Claves: two slightly detuned sines creating a 5 Hz beat frequency for wooden click. */
function playClaves(state, now, vol) {
    const osc1 = acquireOsc(state);
    const osc2 = acquireOsc(state);
    const gain = acquireGain(state);
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(2000, now);
    osc2.frequency.setValueAtTime(2005, now);
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain); osc2.connect(gain); gain.connect(state.audioCtx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + 0.08); osc2.stop(now + 0.08);
}

/** Djembe: sine + triangle mix with deep downward pitch sweep, frequency varies by channel. */
function playDjembe(state, now, vol, channelName) {
    const osc1 = acquireOsc(state);
    const osc2 = acquireOsc(state);
    const gain = acquireGain(state);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(channelName.startsWith('A') ? 180 : 150, now);
    osc2.frequency.setValueAtTime(channelName.startsWith('A') ? 180 : 150, now);
    osc1.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(vol * 0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain); osc2.connect(gain); gain.connect(state.audioCtx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + 0.2); osc2.stop(now + 0.2);
}

/** Timbale: sine with fast pitch envelope + noise transient attack, frequency varies by channel. */
function playTimbale(state, now, vol, channelName) {
    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 560 : 500, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.06);
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(vol * 0.6, now + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.08);

    const noise = getNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(4000, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Castanets: short bandpass noise burst + resonant wood tone at 3.5 kHz. */
function playCastanets(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.Q.setValueAtTime(5, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3500, now);
    oscGain.gain.setValueAtTime(vol * 0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.04);
}

/** EDM synth kick: sub-bass sine + noise transient + mid-range click. */
function playSynthKick(state, now, vol) {
    const subOsc = acquireOsc(state);
    const subGain = acquireGain(state);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    subGain.gain.setValueAtTime(vol * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    subOsc.connect(subGain); subGain.connect(state.audioCtx.destination);
    subOsc.start(now); subOsc.stop(now + 0.25);

    const noise = getNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const midOsc = acquireOsc(state);
    const midGain = acquireGain(state);
    midOsc.type = 'sine';
    midOsc.frequency.setValueAtTime(150, now);
    midOsc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
    midGain.gain.setValueAtTime(vol * 0.5, now);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    midOsc.connect(midGain); midGain.connect(state.audioCtx.destination);
    midOsc.start(now); midOsc.stop(now + 0.06);
}

/** Electronic snare: sine body + noise through formant bandpass filter. */
function playElectronicSnare(state, now, vol) {
    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    oscGain.gain.setValueAtTime(vol * 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.1);

    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2500, now);
    filter.Q.setValueAtTime(3, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Foot tap: very short bandpass noise click at 180 Hz. */
function playFootTap(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, now);
    filter.Q.setValueAtTime(1, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(vol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Hand slap: noise burst + medium sine resonance. */
function playSlap(state, now, vol) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    oscGain.gain.setValueAtTime(vol * 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.05);
}

function playBataTonalDrum(state, now, vol, { fundamental, overtones, decay, slapMix }) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    createBataTone(state, fundamental, 0.6, masterGain, now, decay);

    overtones.forEach((ratio, index) => {
        const partialDecay = decay * (1 - (index * 0.08));
        createBataTone(state, fundamental * ratio, 0.35 / (index + 1), masterGain, now, partialDecay);
    });

    if (slapMix > 0) {
        createBataSlap(state, slapMix, masterGain, now, decay * 0.3);
    }
}

/** Batá low (Iyá): largest drum voice with the deepest tonal head. */
function playBataLow(state, now, vol) {
    playBataTonalDrum(state, now, vol, {
        fundamental: 58,
        overtones: [1.38, 1.95, 2.55],
        decay: 0.38,
        slapMix: 0.14
    });
}

/** Batá middle (Itótele): middle-sized drum voice with a tighter tone. */
function playBataMiddle(state, now, vol) {
    playBataTonalDrum(state, now, vol, {
        fundamental: 95,
        overtones: [1.45, 2.08, 2.75],
        decay: 0.31,
        slapMix: 0.2
    });
}

/** Batá high (Okónkolo): smallest drum voice with the highest tonal head. */
function playBataHigh(state, now, vol) {
    playBataTonalDrum(state, now, vol, {
        fundamental: 155,
        overtones: [1.58, 2.35, 3.15],
        decay: 0.24,
        slapMix: 0.28
    });
}

/** Batá slap: sharp small-head slap with little sustained tone. */
function playBataSlap(state, now, vol) {
    const masterGain = acquireGain(state);
    const decay = 0.11;
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    createBataSlap(state, 0.9, masterGain, now, 0.045);
    createBataTone(state, 260, 0.22, masterGain, now, 0.08);
    createBataTone(state, 420, 0.12, masterGain, now, 0.045);
}

/** Helper: creates an individual frequency component for Batá drums. */
function createBataTone(state, freq, volume, targetNode, startTime, duration) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = freq < 100 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq * 1.15, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.04);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(targetNode);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

/** Helper: generates a hand-impact slap transient using white noise through a high-pass filter. */
function createBataSlap(state, volume, targetNode, startTime, duration) {
    const noise = getNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, startTime);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(volume, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(targetNode);
    noise.start(startTime);
}

/** Cajón bass: low-frequency thump from center slap, short decay. */
function playCajonBass(state, now, vol) {
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.15);

    // Box body resonance
    const osc2 = acquireOsc(state);
    const osc2Gain = acquireGain(state);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    osc2Gain.gain.setValueAtTime(vol * 0.25, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.connect(osc2Gain); osc2Gain.connect(state.audioCtx.destination);
    osc2.start(now); osc2.stop(now + 0.08);
}

/** Cajón slap: sharp edge strike with snare-like crack and high-frequency content. */
function playCajonSlap(state, now, vol) {
    // High-frequency wood crack
    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    // Mid-frequency slap tone
    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.03);
    oscGain.gain.setValueAtTime(vol * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.05);
}

/** Cabasa / Shekere: clustered bead rattle with a hollow body resonance. */
function playCabasaShekere(state, now, vol) {
    const bodyFilter = state.audioCtx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(4200, now);
    bodyFilter.Q.setValueAtTime(1.7, now);
    bodyFilter.connect(state.audioCtx.destination);

    const grainCount = 9;
    for (let grainIndex = 0; grainIndex < grainCount; grainIndex++) {
        const grainStart = now + grainIndex * 0.012;
        const noise = getNoiseSource(state);
        if (!noise) return;
        const grainGain = acquireGain(state);
        const accent = grainIndex % 3 === 0 ? 0.38 : 0.22;
        grainGain.gain.setValueAtTime(vol * accent, grainStart);
        grainGain.gain.exponentialRampToValueAtTime(0.001, grainStart + 0.026);
        noise.connect(grainGain);
        grainGain.connect(bodyFilter);
        noise.start(grainStart);
    }
}

/** Gankogui double bell: dry high/low iron bell pair with bright partials. */
function playGankogui(state, now, vol, channelName) {
    const highFirst = channelName.startsWith('A');
    const firstFreq = highFirst ? 980 : 620;
    const secondFreq = highFirst ? 620 : 980;
    createMetalBellStrike(state, firstFreq, now, vol * 0.65, 0.22);
    createMetalBellStrike(state, secondFreq, now + 0.055, vol * 0.5, 0.18);
}

/** Guiro scraper: stepped ratchet of short filtered-noise ridges. */
function playGuiro(state, now, vol) {
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.Q.setValueAtTime(5.5, now);
    filter.connect(state.audioCtx.destination);

    const ridgeCount = 8;
    for (let ridgeIndex = 0; ridgeIndex < ridgeCount; ridgeIndex++) {
        const ridgeStart = now + ridgeIndex * 0.018;
        const noise = getNoiseSource(state);
        if (!noise) return;
        const ridgeGain = acquireGain(state);
        const accent = ridgeIndex === 0 || ridgeIndex === ridgeCount - 1 ? 0.45 : 0.3;
        ridgeGain.gain.setValueAtTime(vol * accent, ridgeStart);
        ridgeGain.gain.exponentialRampToValueAtTime(0.001, ridgeStart + 0.018);
        noise.connect(ridgeGain);
        ridgeGain.connect(filter);
        noise.start(ridgeStart);
    }
}

/** Talking drum: pitched hand drum with an expressive upward bend. */
function playTalkingDrum(state, now, vol, channelName) {
    const startFreq = channelName.startsWith('A') ? 145 : 115;
    const peakFreq = channelName.startsWith('A') ? 310 : 245;
    const endFreq = channelName.startsWith('A') ? 220 : 175;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.075);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.22);
    gain.gain.setValueAtTime(vol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.24);

    const noise = getNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Temple block: tuned woody strike with a short downward pitch bend. */
function playTempleBlock(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 1120 : 780;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    const filter = state.audioCtx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.22, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.035);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.Q.setValueAtTime(7, now);
    gain.gain.setValueAtTime(vol * 0.82, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.1);
}

/** Triangle: bright metallic ring with a pure sustained decay. */
function playTriangle(state, now, vol) {
    createMetalBellStrike(state, 3600, now, vol * 0.5, 0.7);
    createMetalBellStrike(state, 5400, now, vol * 0.22, 0.45);
}

/** Udu: hollow clay-pot bass with a soft air transient. */
function playUdu(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 155 : 125;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    const filter = state.audioCtx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.35, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.07);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    gain.gain.setValueAtTime(vol * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.3);

    const air = getNoiseSource(state);
    if (!air) return;
    const airFilter = state.audioCtx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.setValueAtTime(260, now);
    airFilter.Q.setValueAtTime(1.8, now);
    const airGain = acquireGain(state);
    airGain.gain.setValueAtTime(vol * 0.25, now);
    airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    air.connect(airFilter); airFilter.connect(airGain); airGain.connect(state.audioCtx.destination);
    air.start(now);
}

/** Helper: creates an inharmonic metallic strike with a few bright partials. */
function createMetalBellStrike(state, frequency, startTime, volume, duration) {
    [1, 1.48, 2.17].forEach((ratio, partialIndex) => {
        const osc = acquireOsc(state);
        const gain = acquireGain(state);
        osc.type = partialIndex === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(frequency * ratio, startTime);
        gain.gain.setValueAtTime(volume / (partialIndex + 1), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * (1 - partialIndex * 0.18));
        osc.connect(gain); gain.connect(state.audioCtx.destination);
        osc.start(startTime); osc.stop(startTime + duration);
    });
}

/** Pre-allocated pools of Web Audio nodes to avoid per-hit allocation. */
const NODE_POOL_SIZE = 48;
let _oscPool = [];
let _gainPool = [];
const _oscGains = new WeakMap();

function _fillPools(audioCtx) {
    while (_oscPool.length < NODE_POOL_SIZE) {
        _oscPool.push(audioCtx.createOscillator());
    }
    while (_gainPool.length < NODE_POOL_SIZE) {
        _gainPool.push(audioCtx.createGain());
    }
}

function acquireOsc(state) {
    const osc = _oscPool.pop() || state.audioCtx.createOscillator();
    const _connect = osc.connect.bind(osc);
    osc.connect = function (dest) {
        if (dest instanceof GainNode && !_oscGains.has(osc)) {
            const ended = () => {
                const gains = _oscGains.get(osc);
                if (gains) {
                    gains.forEach(g => releaseGain(g));
                    _oscGains.delete(osc);
                }
                osc.removeEventListener('ended', ended);
            };
            osc.addEventListener('ended', ended);
        }
        if (dest instanceof GainNode) {
            const gains = _oscGains.get(osc) || [];
            gains.push(dest);
            _oscGains.set(osc, gains);
        }
        return _connect(dest);
    };
    _fillPools(state.audioCtx);
    return osc;
}

function acquireGain(state) {
    const gain = _gainPool.pop();
    if (gain) {
        gain.gain.cancelScheduledValues(0);
        _fillPools(state.audioCtx);
        return gain;
    }
    _fillPools(state.audioCtx);
    return state.audioCtx.createGain();
}

function releaseGain(gain) {
    gain.disconnect();
    if (_gainPool.length < NODE_POOL_SIZE * 2) {
        _gainPool.push(gain);
    }
}

/** Pre-fills node pools. Called on AudioContext creation. */
export function primeNodePools(audioCtx) {
    _fillPools(audioCtx);
}

/** Dispatch table mapping instrument value keys to their synthesis functions. */
const instruments = {
    kick: playKick,
    snare: playSnare,
    cl_hihat: playClosedHiHat,
    op_hihat: playOpenHiHat,
    shaker: playShaker,
    tom: playTom,
    clap: playClap,
    agogo: playAgogo,
    ping: playPing,
    rimshot: playRimshot,
    woodblock: playWoodblock,
    cowbell: playCowbell,
    tambourine: playTambourine,
    conga_low: playCongaLow,
    conga_middle: playCongaMiddle,
    conga_high: playCongaHigh,
    bongo_low: playBongoLow,
    bongo_high: playBongoHigh,
    maraca: playMaraca,
    crash: playCrash,
    ride: playRide,
    claves: playClaves,
    cabasa_shekere: playCabasaShekere,
    djembe: playDjembe,
    timbale: playTimbale,
    castanets: playCastanets,
    synth_kick: playSynthKick,
    electronic_snare: playElectronicSnare,
    foot_tap: playFootTap,
    gankogui: playGankogui,
    guiro: playGuiro,
    conga_slap: playCongaSlap,
    slap: playSlap,
    talking_drum: playTalkingDrum,
    temple_block: playTempleBlock,
    triangle: playTriangle,
    udu: playUdu,
    bata_low: playBataLow,
    bata_middle: playBataMiddle,
    bata_high: playBataHigh,
    bata_slap: playBataSlap,
    cajon_bass: playCajonBass,
    cajon_slap: playCajonSlap
};

/**
 * Plays the sound for a given channel. Applies the channel's volume,
 * mute state, gain scale, and the global volume multiplier.
 * For multi-voice channels (master, A, B), plays all active voices.
 */
export function playChannelSound(state, channels, channelName, globalVolume = 1, voiceIndex = null, hitTime = null) {
    if (!state.audioEnabled || !state.audioCtx) return;

    const scheduleTime = hitTime ?? state.audioCtx.currentTime;

    // Multi-voice channels: play specific voice or all voices
    if (channelName === 'master') {
        const voices = channels.masterVoices || [];
        if (voiceIndex !== null) {
            // Play only the specified voice
            if (voices[voiceIndex]) playSingleChannel(state, voices[voiceIndex], globalVolume, scheduleTime);
        } else {
            voices.forEach(channel => {
                playSingleChannel(state, channel, globalVolume, scheduleTime);
            });
        }
    } else if (channelName === 'A') {
        const voices = channels.Avoices || [];
        if (voiceIndex !== null) {
            if (voices[voiceIndex]) playSingleChannel(state, voices[voiceIndex], globalVolume, scheduleTime);
        } else {
            voices.forEach(channel => {
                playSingleChannel(state, channel, globalVolume, scheduleTime);
            });
        }
    } else if (channelName === 'B') {
        const voices = channels.Bvoices || [];
        if (voiceIndex !== null) {
            if (voices[voiceIndex]) playSingleChannel(state, voices[voiceIndex], globalVolume, scheduleTime);
        } else {
            voices.forEach(channel => {
                playSingleChannel(state, channel, globalVolume, scheduleTime);
            });
        }
    } else {
        // Fixed single-voice channels
        const channel = channels[channelName];
        if (channel) playSingleChannel(state, channel, globalVolume, scheduleTime);
    }
}

/** Plays a sound for a single channel if not muted. Uses a 25ms lookahead floor for audio thread prep. */
export function playSingleChannel(state, channel, globalVolume, hitTime) {
    if (!channel || channel.muted) return;
    if (!channel.sound) return;

    const vol = channel.volume * channel.gainScale * globalVolume;
    if (vol <= 0) return;

    const fn = instruments[channel.sound];
    if (!fn) return;

    const now = hitTime
        ? Math.max(hitTime, state.audioCtx.currentTime + 0.025)
        : state.audioCtx.currentTime;
    fn(state, now, vol, channel.prefix || '');
}
