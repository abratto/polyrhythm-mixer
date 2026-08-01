/**
 * instruments.js — Real-time Web Audio percussion synthesis.
 *
 * Each instrument is a function that creates short-lived oscillator, noise,
 * and filter nodes to synthesize percussion sounds. No samples — pure synthesis.
 */

import { acquireOsc as poolAcquireOsc } from './pool.js';
import { instrumentData } from './instrument-data.js';

function acquireOsc(state) { return poolAcquireOsc(state.audioCtx); }

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
    { value: 'bata_low_press', label: 'Batá Press (Low)' },
    { value: 'bata_middle_press', label: 'Batá Press (Middle)' },
    { value: 'bata_slap', label: 'Batá Slap' },
    { value: 'bata_high_slap', label: 'Batá Slap (High)' },
    { value: 'bata_low_slap', label: 'Batá Slap (Low)' },
    { value: 'bata_middle_slap', label: 'Batá Slap (Middle)' },
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
    { value: 'cajon_trad_bass', label: 'Traditional Cajón Bass' },
    { value: 'cajon_trad_slap', label: 'Traditional Cajón Slap' },
    { value: 'cajon_snare_bass', label: 'Snare Cajón Bass' },
    { value: 'cajon_snare_slap', label: 'Snare Cajón Slap' },
    { value: 'crash', label: 'Crash Cymbal' },
    { value: 'ping', label: 'Crystal High Ping' },
    { value: 'synth_kick', label: 'EDM Synth Kick' },
    { value: 'electronic_snare', label: 'Electronic Snare' },
    { value: 'foot_tap', label: 'Foot Tap' },
    { value: 'djembe', label: 'Djembe' },
    { value: 'frame_drum', label: 'Frame Drum (Tar)' },
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

// ── Noise source & instrument functions ─────────────────────────────────
/**
 * Pre-generates a 1-second noise buffer that can be reused for short sounds.
 * Short sounds just start the source and let it auto-stop, so we only need
 * one buffer and create new BufferSource nodes from it.
 */
let _noiseBuffer = null;

function acquireNoiseSource(state) {
    if (!state.audioCtx) return null;
    if (!_noiseBuffer) {
        const duration = 1.0;
        const bufferSize = Math.floor(state.audioCtx.sampleRate * duration);
        _noiseBuffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
        const data = _noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }
    const newSource = state.audioCtx.createBufferSource();
    newSource.buffer = _noiseBuffer;
    newSource.onended = () => newSource.disconnect();
    return newSource;
}

// ===== Instrument synthesis functions =====

/** Kick drum: sine oscillator with fast pitch sweep downward. */
function playKick(state, now, vol) {    const p = instrumentData.kick.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(p.endFreq, now + p.sweepTime);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.decay);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay);
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

    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
function playTom(state, now, vol, channelName) {    const p = instrumentData.tom.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? p.startFreq + 50 : p.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(channelName.startsWith('A') ? p.endFreq + 30 : p.endFreq, now + p.sweepTime);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.decay);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay);
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
        const burst = acquireNoiseSource(state);
        if (!burst) return;
        const burstGain = acquireGain(state);
        burstGain.gain.setValueAtTime(vol * 0.45, now + delay);
        burstGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);
        burst.connect(filter);
        filter.connect(burstGain);
        burstGain.connect(state.audioCtx.destination);
        burst.start(now + delay);
    });

    const mainClap = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const p = instrumentData.bongo_low.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const baseFreq = channelName.startsWith('A') ? p.baseFreq + 15 : p.baseFreq;
    const decay = p.bodyDecay;

    // 1. Fundamental (sine)
    const osc1 = acquireOsc(state);
    const gain1 = acquireGain(state);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * p.pitchBend, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.025);
    gain1.gain.setValueAtTime(p.bodyVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start(now); osc1.stop(now + decay);

    // 2. First Overtone (triangle, inharmonic ratio 1.593)
    const osc2 = acquireOsc(state);
    const gain2 = acquireGain(state);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * p.overRatio * p.pitchBend, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * p.overRatio, now + 0.025);
    gain2.gain.setValueAtTime(p.overVol, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + (decay * p.overDecay));
    osc2.connect(gain2); gain2.connect(masterGain);
    osc2.start(now); osc2.stop(now + (decay * 0.45));

    // 3. Hand impact transient (bandpass noise)
    const noise = acquireNoiseSource(state);
    if (noise) {
        const noiseFilter = state.audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(p.noiseFreq, now);
        noiseFilter.Q.setValueAtTime(p.noiseQ, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(p.noiseVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + p.noiseDecay);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
    }

    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay + 0.05);
}
/** Bongo high (Macho): Tighter, higher-pitched variant with faster decay and brighter slap. */
function playBongoHigh(state, now, vol, channelName) {
    const p = instrumentData.bongo_high.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const baseFreq = channelName.startsWith('A') ? p.baseFreq + 29 : p.baseFreq;
    const decay = p.bodyDecay;

    const osc1 = acquireOsc(state);
    const gain1 = acquireGain(state);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * p.pitchBend, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.02);
    gain1.gain.setValueAtTime(p.bodyVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start(now); osc1.stop(now + decay);

    const osc2 = acquireOsc(state);
    const gain2 = acquireGain(state);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * p.overRatio * p.pitchBend, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * p.overRatio, now + 0.02);
    gain2.gain.setValueAtTime(p.overVol, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + (decay * p.overDecay));
    osc2.connect(gain2); gain2.connect(masterGain);
    osc2.start(now); osc2.stop(now + (decay * p.overDecay));

    const noise = acquireNoiseSource(state);
    if (noise) {
        const noiseFilter = state.audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(p.noiseFreq, now);
        noiseFilter.Q.setValueAtTime(p.noiseQ, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(p.noiseVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + p.noiseDecay);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
    }

    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay + 0.05);
}
/** Maraca: bandpass noise with amplitude modulation to simulate shaking. */
function playMaraca(state, now, vol) {
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const p = instrumentData.djembe.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const bassFreq = channelName.startsWith('A') ? p.bassFreq + 10 : p.bassFreq;
    const bassDecay = p.bassDecay;

    // 1. Cavity fundamental (sine) — deep Helmholtz resonance
    const subOsc = acquireOsc(state);
    const subGain = acquireGain(state);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(bassFreq * p.bassPitchBend, now);
    subOsc.frequency.exponentialRampToValueAtTime(bassFreq, now + 0.04);
    subGain.gain.setValueAtTime(p.bassVol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + p.bassDecay);
    subOsc.connect(subGain); subGain.connect(masterGain);
    subOsc.start(now); subOsc.stop(now + bassDecay);

    // 2. High skin resonance (triangle for stiffness)
    const skinOsc = acquireOsc(state);
    const skinGain = acquireGain(state);
    const skinFreq = bassFreq * p.skinRatio;
    skinOsc.type = 'triangle';
    skinOsc.frequency.setValueAtTime(skinFreq * p.skinPitchBend, now);
    skinOsc.frequency.exponentialRampToValueAtTime(skinFreq, now + 0.03);
    skinGain.gain.setValueAtTime(p.skinVol, now);
    skinGain.gain.exponentialRampToValueAtTime(0.001, now + p.skinDecay);
    skinOsc.connect(skinGain); skinGain.connect(masterGain);
    skinOsc.start(now); skinOsc.stop(now + p.skinDecay);

    // 3. Slap transient (bright bandpass noise)
    const noise = acquireNoiseSource(state);
    if (noise) {
        const filter = state.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(p.slapFreq, now);
        filter.Q.setValueAtTime(p.slapQ, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(p.slapVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + p.slapDecay);
        noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
    }
}

/** Frame Drum (Tar): Shallow pure-membrane thud with pitch-bend and soft transient. */
function playFrameDrum(state, now, vol, channelName) {
    const p = instrumentData.frame_drum.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const baseFreq = channelName.startsWith('A') ? 110 : 95;
    const decay = 0.22;

    // 1. Membrane fundamental (sine) with aggressive pitch bend (40%)
    const osc1 = acquireOsc(state);
    const gain1 = acquireGain(state);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * 1.4, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.035);
    gain1.gain.setValueAtTime(0.8, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start(now); osc1.stop(now + decay);

    // 2. Inharmonic edge overtone (Bessel ratio 1.593)
    const osc2 = acquireOsc(state);
    const gain2 = acquireGain(state);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.593 * 1.3, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.593, now + 0.03);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + (decay * 0.6));
    osc2.connect(gain2); gain2.connect(masterGain);
    osc2.start(now); osc2.stop(now + (decay * 0.6));

    // 3. Flesh transient (mid-range papery thud)
    const noise = acquireNoiseSource(state);
    if (noise) {
        const filter = state.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.Q.setValueAtTime(1.0, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(p.noiseVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
    }
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

    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const p = instrumentData.synth_kick.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const subOsc = acquireOsc(state);
    const subGain = acquireGain(state);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    subGain.gain.setValueAtTime(vol * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    subOsc.connect(subGain); subGain.connect(state.audioCtx.destination);
    subOsc.start(now); subOsc.stop(now + 0.25);

    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + p.slapDecay);
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

    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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
    const noise = acquireNoiseSource(state);
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

function playBataTonalDrum(state, now, vol, { fundamental, overtoneRatio, chachaRatio, slapFilterFreq, rootDecay, overtoneDecay, chachaDecay, slapDecay }) {
    const masterGain = acquireGain(state);
    masterGain.connect(state.audioCtx.destination);

    // 1. Root — pitch bend simulates skin stretch, long sustain
    const rootOsc = acquireOsc(state);
    const rootGain = acquireGain(state);
    rootOsc.type = 'sine';
    rootOsc.frequency.setValueAtTime(fundamental + 30, now);
    rootOsc.frequency.exponentialRampToValueAtTime(fundamental, now + 0.04);
    rootGain.gain.setValueAtTime(vol * 0.95, now);
    rootGain.gain.exponentialRampToValueAtTime(0.001, now + rootDecay);
    rootOsc.connect(rootGain); rootGain.connect(masterGain);
    rootOsc.start(now); rootOsc.stop(now + rootDecay + 0.05);

    // 2. Shell overtone — inharmonic Bessel ratio, fast decay
    const overtoneOsc = acquireOsc(state);
    const overtoneGain = acquireGain(state);
    overtoneOsc.type = 'sine';
    overtoneOsc.frequency.setValueAtTime(fundamental * overtoneRatio, now);
    overtoneGain.gain.setValueAtTime(vol * 0.4, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + overtoneDecay);
    overtoneOsc.connect(overtoneGain); overtoneGain.connect(masterGain);
    overtoneOsc.start(now); overtoneOsc.stop(now + overtoneDecay + 0.05);

    // 3. Chachá sympathetic — delayed swell from coupled head
    const chachaOsc = acquireOsc(state);
    const chachaGain = acquireGain(state);
    chachaOsc.type = 'sine';
    chachaOsc.frequency.setValueAtTime(fundamental * chachaRatio, now);
    chachaGain.gain.setValueAtTime(0, now);
    chachaGain.gain.linearRampToValueAtTime(vol * 0.15, now + 0.02);
    chachaGain.gain.exponentialRampToValueAtTime(0.001, now + chachaDecay);
    chachaOsc.connect(chachaGain); chachaGain.connect(masterGain);
    chachaOsc.start(now); chachaOsc.stop(now + chachaDecay + 0.05);

    // 4. Slap — hand impact transient
    createBataSlap(state, vol * 0.6, masterGain, now, slapDecay, slapFilterFreq);
}

/** Batá low (Iyá): largest drum — deep fundamental, octave chachá. */
function playBataLow(state, now, vol) {
    playBataTonalDrum(state, now, vol, {
        fundamental: 150,
        overtoneRatio: 1.54,
        chachaRatio: 2.0,
        slapFilterFreq: 500,
        rootDecay: 0.45,
        overtoneDecay: 0.18,
        chachaDecay: 0.30,
        slapDecay: 0.06
    });
}

/** Batá middle (Itótele): mid-sized drum — warm tone, octave chachá. */
function playBataMiddle(state, now, vol) {
    playBataTonalDrum(state, now, vol, {
        fundamental: 220,
        overtoneRatio: 1.54,
        chachaRatio: 2.0,
        slapFilterFreq: 800,
        rootDecay: 0.35,
        overtoneDecay: 0.15,
        chachaDecay: 0.25,
        slapDecay: 0.05
    });
}

/** Batá high (Okónkolo): smallest drum — bright tone, fifth chachá. */
function playBataHigh(state, now, vol) {
    playBataTonalDrum(state, now, vol, {
        fundamental: 300,
        overtoneRatio: 1.54,
        chachaRatio: 1.5,
        slapFilterFreq: 1200,
        rootDecay: 0.28,
        overtoneDecay: 0.12,
        chachaDecay: 0.20,
        slapDecay: 0.04
    });
}

/** Batá slap: sharp small-head slap with little sustained tone. */
function playBataSlap(state, now, vol) {
    playBataSlapVariant(state, now, vol, {
        fundamental1: 260, fundamental2: 420, noiseFilterFreq: 1200, decay: 0.11, slapDuration: 0.045
    });
}

/** Batá slap — general variant helper parameterized by drum size. */
function playBataSlapVariant(state, now, vol, { fundamental1, fundamental2, noiseFilterFreq, decay, slapDuration }) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    createBataSlap(state, 0.9, masterGain, now, slapDuration, noiseFilterFreq);
    createBataTone(state, fundamental1, 0.22, masterGain, now, decay * 0.7);
    createBataTone(state, fundamental2, 0.12, masterGain, now, decay * 0.4);
}

/** Batá low slap — largest drum, deep chachá with octave enú coupling. */
function playBataLowSlap(state, now, vol) {
    playChachaSlap(state, now, vol, {
        chachaFundamental: 225,
        bodyOvertones: [1.6, 2.3, 3.1],
        enuCouplingFreq: 150,
        enuCouplingDelay: 0.002,
        enuCouplingAttack: 0.008,
        noiseFilterFreq: 1800,
        noiseDecay: 0.05,
        bodyDecay: 0.13,
        couplingDecay: 0.06
    });
}

/** Batá middle slap — mid-sized drum, aggressive crack with enú coupling. */
function playBataMiddleSlap(state, now, vol) {
    playChachaSlap(state, now, vol, {
        chachaFundamental: 350,
        bodyOvertones: [1.6, 2.4, 3.2],
        enuCouplingFreq: 220,
        enuCouplingDelay: 0.002,
        enuCouplingAttack: 0.007,
        noiseFilterFreq: 2500,
        noiseDecay: 0.04,
        bodyDecay: 0.11,
        couplingDecay: 0.05
    });
}

/** Batá high slap — smallest drum, octave chachá, tight enú coupling. */
function playBataHighSlap(state, now, vol) {
    playChachaSlap(state, now, vol, {
        chachaFundamental: 600,
        bodyOvertones: [1.7, 2.5, 3.4],
        enuCouplingFreq: 300,
        enuCouplingDelay: 0.0015,
        enuCouplingAttack: 0.005,
        noiseFilterFreq: 3200,
        noiseDecay: 0.03,
        bodyDecay: 0.09,
        couplingDecay: 0.04
    });
}

/** Chachá slap — 3-layer physical model: transient, body, coupling. */
function playChachaSlap(state, now, vol, { chachaFundamental, bodyOvertones, enuCouplingFreq, enuCouplingDelay, enuCouplingAttack, noiseFilterFreq, noiseDecay, bodyDecay, couplingDecay }) {
    const masterGain = acquireGain(state);
    masterGain.connect(state.audioCtx.destination);

    // 1. Transient — filtered noise burst with ±10% volume jitter
    const transientJitter = 0.9 + Math.random() * 0.2;
    createBataSlap(state, vol * 0.55 * transientJitter, masterGain, now, noiseDecay, noiseFilterFreq);

    // 2. Body — inharmonic overtones with muted fundamental, ±15% volume jitter
    const bodyJitter = 0.85 + Math.random() * 0.3;
    const bodyOsc = acquireOsc(state);
    const bodyGain = acquireGain(state);
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(chachaFundamental, now);
    bodyGain.gain.setValueAtTime(vol * 0.08 * bodyJitter, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + bodyDecay);
    bodyOsc.connect(bodyGain); bodyGain.connect(masterGain);
    bodyOsc.start(now); bodyOsc.stop(now + bodyDecay + 0.05);

    bodyOvertones.forEach(ratio => {
        const overtoneJitter = 0.85 + Math.random() * 0.3;
        const osc = acquireOsc(state);
        const gain = acquireGain(state);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(chachaFundamental * ratio, now);
        gain.gain.setValueAtTime(vol * 0.18 * overtoneJitter / ratio, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + bodyDecay * 0.7);
        osc.connect(gain); gain.connect(masterGain);
        osc.start(now); osc.stop(now + bodyDecay * 0.7 + 0.05);
    });

    // 3. Enú coupling — low-pass sine at enú fundamental, micro-delayed, smoothed attack
    const couplingDelay = now + enuCouplingDelay;
    const couplingOsc = acquireOsc(state);
    const couplingGain = acquireGain(state);
    couplingOsc.type = 'sine';
    couplingOsc.frequency.setValueAtTime(enuCouplingFreq, couplingDelay);
    couplingGain.gain.setValueAtTime(0, couplingDelay);
    couplingGain.gain.linearRampToValueAtTime(vol * 0.06, couplingDelay + enuCouplingAttack);
    couplingGain.gain.exponentialRampToValueAtTime(0.001, couplingDelay + couplingDecay);
    couplingOsc.connect(couplingGain); couplingGain.connect(masterGain);
    couplingOsc.start(couplingDelay); couplingOsc.stop(couplingDelay + couplingDecay + 0.05);
}

/** Batá low press (Iyá): heavy muted thud, semitone pitch bend, slower sweep. */
function playBataLowPress(state, now, vol) {
    playBataPress(state, now, vol, {
        fundamental: 150,
        overtoneFreq: 225,
        pitchBendRatio: 1.059,
        pitchBendDuration: 0.025,
        ampDecay: 0.085,
        filterStartFreq: 600,
        filterEndFreq: 150,
        filterSweepDuration: 0.040
    });
}

/** Batá middle press (Itótele): sharp muted bop, whole-step pitch bend, fast sweep. */
function playBataMiddlePress(state, now, vol) {
    playBataPress(state, now, vol, {
        fundamental: 220,
        overtoneFreq: 330,
        pitchBendRatio: 1.122,
        pitchBendDuration: 0.015,
        ampDecay: 0.050,
        filterStartFreq: 900,
        filterEndFreq: 220,
        filterSweepDuration: 0.030
    });
}

/** Batá press (muff) — amplitude thud + pitch doink + filter muffle. */
function playBataPress(state, now, vol, { fundamental, overtoneFreq, pitchBendRatio, pitchBendDuration, ampDecay, filterStartFreq, filterEndFreq, filterSweepDuration }) {
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(filterStartFreq * vol, now);
    filter.frequency.exponentialRampToValueAtTime(filterEndFreq, now + filterSweepDuration);

    const masterGain = acquireGain(state);
    const maxGain = vol * vol * 1.3;
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(maxGain, now + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + ampDecay);
    masterGain.connect(state.audioCtx.destination);

    const rootOsc = acquireOsc(state);
    rootOsc.type = 'sine';
    const rootImpactFreq = fundamental * pitchBendRatio;
    rootOsc.frequency.setValueAtTime(rootImpactFreq, now);
    rootOsc.frequency.exponentialRampToValueAtTime(fundamental, now + pitchBendDuration);
    rootOsc.connect(filter);
    rootOsc.start(now); rootOsc.stop(now + ampDecay + 0.02);

    const overtoneOsc = acquireOsc(state);
    overtoneOsc.type = 'sine';
    const overtoneImpactFreq = overtoneFreq * pitchBendRatio;
    overtoneOsc.frequency.setValueAtTime(overtoneImpactFreq, now);
    overtoneOsc.frequency.exponentialRampToValueAtTime(overtoneFreq, now + pitchBendDuration);
    overtoneOsc.connect(filter);

    filter.connect(masterGain);
    overtoneOsc.start(now); overtoneOsc.stop(now + ampDecay + 0.02);
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
function createBataSlap(state, volume, targetNode, startTime, duration, filterFreq = 1200) {
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(filterFreq, startTime);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(volume, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(targetNode);
    noise.start(startTime);
}

/** Cajón bass: low-frequency thump from center slap, short decay. */
/** Traditional Cajón Bass: Pure wood and air cavity resonance. */
function playCajonBassTraditional(state, now, vol) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const cavityOsc = acquireOsc(state);
    const cavityGain = acquireGain(state);
    cavityOsc.type = 'sine';
    cavityOsc.frequency.setValueAtTime(70, now);
    cavityGain.gain.setValueAtTime(0.9, now);
    cavityGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    cavityOsc.connect(cavityGain); cavityGain.connect(masterGain);
    cavityOsc.start(now); cavityOsc.stop(now + 0.35);

    const woodOsc = acquireOsc(state);
    const woodGain = acquireGain(state);
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(120, now);
    woodGain.gain.setValueAtTime(0.4, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    woodOsc.connect(woodGain); woodGain.connect(masterGain);
    woodOsc.start(now); woodOsc.stop(now + 0.12);

    const noise = acquireNoiseSource(state);
    if (noise) {
        const filter = state.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
    }
}

/** Traditional Cajón Slap: Pure high-frequency wood crack and corner resonance. */
function playCajonSlapTraditional(state, now, vol) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const edgeOsc = acquireOsc(state);
    const edgeGain = acquireGain(state);
    edgeOsc.type = 'triangle';
    edgeOsc.frequency.setValueAtTime(380, now);
    edgeGain.gain.setValueAtTime(0.3, now);
    edgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    edgeOsc.connect(edgeGain); edgeGain.connect(masterGain);
    edgeOsc.start(now); edgeOsc.stop(now + 0.08);

    const crackNoise = acquireNoiseSource(state);
    if (crackNoise) {
        const crackFilter = state.audioCtx.createBiquadFilter();
        crackFilter.type = 'bandpass';
        crackFilter.frequency.setValueAtTime(2500, now);
        crackFilter.Q.setValueAtTime(1.5, now);
        const crackGain = acquireGain(state);
        crackGain.gain.setValueAtTime(0.6, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        crackNoise.connect(crackFilter); crackFilter.connect(crackGain); crackGain.connect(masterGain);
        crackNoise.start(now);
    }
}

/** Snare Cajón Bass: Wood, air cavity, and a subtle sympathetic snare flutter. */
function playCajonBassSnare(state, now, vol) {
    playCajonBassTraditional(state, now, vol);

    const snareNoise = acquireNoiseSource(state);
    if (snareNoise) {
        const masterGain = acquireGain(state);
        masterGain.gain.setValueAtTime(vol, now);
        masterGain.connect(state.audioCtx.destination);
        const snareFilter = state.audioCtx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.setValueAtTime(3000, now);
        const snareGain = acquireGain(state);
        snareGain.gain.setValueAtTime(0.15, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        snareNoise.connect(snareFilter); snareFilter.connect(snareGain); snareGain.connect(masterGain);
        snareNoise.start(now);
    }
}

/** Snare Cajón Slap: Wood crack layered with a prominent, sustained snare wire buzz. */
function playCajonSlapSnare(state, now, vol) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const edgeOsc = acquireOsc(state);
    const edgeGain = acquireGain(state);
    edgeOsc.type = 'triangle';
    edgeOsc.frequency.setValueAtTime(380, now);
    edgeGain.gain.setValueAtTime(0.3, now);
    edgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    edgeOsc.connect(edgeGain); edgeGain.connect(masterGain);
    edgeOsc.start(now); edgeOsc.stop(now + 0.08);

    const crackNoise = acquireNoiseSource(state);
    if (crackNoise) {
        const crackFilter = state.audioCtx.createBiquadFilter();
        crackFilter.type = 'bandpass';
        crackFilter.frequency.setValueAtTime(2500, now);
        crackFilter.Q.setValueAtTime(1.5, now);
        const crackGain = acquireGain(state);
        crackGain.gain.setValueAtTime(0.5, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        crackNoise.connect(crackFilter); crackFilter.connect(crackGain); crackGain.connect(masterGain);
        crackNoise.start(now);
    }

    const snareNoise = acquireNoiseSource(state);
    if (snareNoise) {
        const snareFilter = state.audioCtx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.setValueAtTime(3500, now);
        const snareGain = acquireGain(state);
        snareGain.gain.setValueAtTime(0.6, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        snareNoise.connect(snareFilter); snareFilter.connect(snareGain); snareGain.connect(masterGain);
        snareNoise.start(now);
    }
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
        const noise = acquireNoiseSource(state);
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
        const noise = acquireNoiseSource(state);
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

    const noise = acquireNoiseSource(state);
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

    const air = acquireNoiseSource(state);
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

function acquireGain(state) { return state.audioCtx.createGain(); }

/** Dispatch table mapping instrument value keys to their synthesis functions. */
export const instruments = {
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
    frame_drum: playFrameDrum,
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
    bata_low_press: playBataLowPress,
    bata_middle_press: playBataMiddlePress,
    bata_high_slap: playBataHighSlap,
    bata_low_slap: playBataLowSlap,
    bata_middle_slap: playBataMiddleSlap,
    cajon_trad_bass: playCajonBassTraditional,
    cajon_trad_slap: playCajonSlapTraditional,
    cajon_snare_bass: playCajonBassSnare,
    cajon_snare_slap: playCajonSlapSnare
};
