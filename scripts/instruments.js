/**
 * instruments.js — Real-time Web Audio percussion synthesis.
 *
 * Each instrument is a function that creates short-lived oscillator, noise,
 * and filter nodes to synthesize percussion sounds. No samples — pure synthesis.
 */

import { acquireOsc as poolAcquireOsc } from './pool.js';
import { instrumentData } from './instrument-data.js';

// The Web Audio API cannot exponentially ramp to exactly 0, so decaying
// envelopes ramp to this floor instead — effectively silent.
const MIN_GAIN = 0.001;

function acquireOsc(state) { return poolAcquireOsc(state.audioCtx); }

function registerCleanup(osc, ...nodes) {
    const prev = osc.onended;
    osc.onended = () => {
        if (prev) prev.call(osc);
        nodes.forEach(n => n.disconnect());
    };
}

/**
 * Available percussion instruments, sorted alphabetically by display label.
 * Each entry maps a short value key (used in serialization) to a human-readable label.
 */
export const instrumentCatalog = [
    { value: 'agogo', label: 'Agogo Bell Accent' },
    { value: 'cowbell', label: 'Analog Cowbell' },
    { value: 'axatse_pa', label: 'Axatse Thigh (Pa)' },
    { value: 'axatse_ti', label: 'Axatse Palm (Ti)' },
    { value: 'bata_low', label: 'Batá Drum (Low)' },
    { value: 'bata_middle', label: 'Batá Drum (Middle)' },
    { value: 'bata_high', label: 'Batá Drum (High)' },
    { value: 'bata_low_press', label: 'Batá Press (Low)' },
    { value: 'bata_middle_press', label: 'Batá Press (Middle)' },
    { value: 'bata_high_slap', label: 'Batá Slap (High)' },
    { value: 'bata_low_slap', label: 'Batá Slap (Low)' },
    { value: 'bata_middle_slap', label: 'Batá Slap (Middle)' },
    { value: 'kick', label: 'Bass Drum (Kick)' },
    { value: 'bongo_high', label: 'Bongo (High)' },
    { value: 'bongo_high_slap', label: 'Bongo Slap (High)' },
    { value: 'bongo_low', label: 'Bongo (Low)' },
    { value: 'bongo_low_mute', label: 'Bongo Mute (Low)' },
    { value: 'castanets', label: 'Castanets' },
    { value: 'cabasa_shekere', label: 'Cabasa / Shekere' },
    { value: 'claves', label: 'Claves' },
    { value: 'cl_hihat', label: 'Closed Hi-Hat' },
    { value: 'conga_high', label: 'Conga (High)' },
    { value: 'conga_low', label: 'Conga (Low)' },
    { value: 'conga_middle', label: 'Conga (Middle)' },
    { value: 'conga_high_bass', label: 'Conga Bass (High)' },
    { value: 'conga_low_bass', label: 'Conga Bass (Low)' },
    { value: 'conga_middle_bass', label: 'Conga Bass (Middle)' },
    { value: 'conga_high_press', label: 'Conga Press (High)' },
    { value: 'conga_low_press', label: 'Conga Press (Low)' },
    { value: 'conga_middle_press', label: 'Conga Press (Middle)' },
    { value: 'conga_slap', label: 'Conga Slap' },
    { value: 'conga_high_slap', label: 'Conga Slap (High)' },
    { value: 'conga_low_slap', label: 'Conga Slap (Low)' },
    { value: 'conga_middle_slap', label: 'Conga Slap (Middle)' },
    { value: 'cajon_trad_bass', label: 'Traditional Cajón Bass' },
    { value: 'cajon_trad_slap', label: 'Traditional Cajón Slap' },
    { value: 'cajon_snare_bass', label: 'Snare Cajón Bass' },
    { value: 'cajon_snare_slap', label: 'Snare Cajón Slap' },
    { value: 'cowbell_boca', label: 'Cowbell Mouth (Boca)' },
    { value: 'cowbell_centro', label: 'Cowbell Body (Centro)' },
    { value: 'crash', label: 'Crash Cymbal' },
    { value: 'ping', label: 'Crystal High Ping' },
    { value: 'synth_kick', label: 'EDM Synth Kick' },
    { value: 'electronic_snare', label: 'Electronic Snare' },
    { value: 'ewe_atsimevu', label: 'Ewe Drum (Atsimevu)' },
    { value: 'ewe_atsimevu_stick', label: 'Ewe Drum (Atsimevu Stick)' },
    { value: 'ewe_kaganu', label: 'Ewe Drum (Kaganu)' },
    { value: 'ewe_kidi', label: 'Ewe Drum (Kidi)' },
    { value: 'ewe_kidi_press', label: 'Ewe Drum (Kidi Press)' },
    { value: 'ewe_sogo', label: 'Ewe Drum (Sogo)' },
    { value: 'ewe_sogo_press', label: 'Ewe Drum (Sogo Press)' },
    { value: 'foot_tap', label: 'Foot Tap' },
    { value: 'djembe', label: 'Djembe' },
    { value: 'frame_drum', label: 'Frame Drum (Tar)' },
    { value: 'gankogui_low', label: 'Gankogui Bell (Low)' },
    { value: 'gankogui_high', label: 'Gankogui Bell (High)' },
    { value: 'guiro', label: 'Guiro Scraper' },
    { value: 'slap', label: 'Hand Slap' },
    { value: 'clap', label: 'Handclap' },
    { value: 'maraca', label: 'Maraca' },
    { value: 'op_hihat', label: 'Open Hi-Hat' },
    { value: 'palitos', label: 'Palitos (Cáscara / Catá)' },
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
// Noise buffer, cached PER AudioContext. Instruments are rendered both offline
// (pre-render) and on the live context, and some mobile browsers do not allow a
// buffer created by one context to be played by another — using a shared buffer
// born in the OfflineAudioContext made noise instruments (shaker, hi-hats,
// claps, …) silent on those devices while oscillator instruments still sounded.
// Keying by context keeps each render self-contained.
const _noiseBuffers = new WeakMap();

function acquireNoiseSource(state) {
    const ctx = state.audioCtx;
    if (!ctx) return null;
    let buffer = _noiseBuffers.get(ctx);
    if (!buffer) {
        const duration = 1.0;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        _noiseBuffers.set(ctx, buffer);
    }
    const newSource = ctx.createBufferSource();
    newSource.buffer = buffer;
    newSource.onended = () => newSource.disconnect();
    return newSource;
}

/** Picks a random read offset (seconds) into the 1 s noise buffer, leaving room
 *  for `needSeconds` of playback. Used so layers/micro-bursts read independent
 *  noise and don't comb-filter against each other. */
function randomNoiseOffset(state, needSeconds = 0.2) {
    const ctx = state.audioCtx;
    const max = ctx ? Math.max(0, ctx.sampleRate - 1) / (ctx.sampleRate || 1) - needSeconds : 0;
    return Math.max(0, Math.random() * max);
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
    registerCleanup(osc, gain);
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
    registerCleanup(osc, oscGain);

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
    const p = readParams('cl_hihat');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(vol * p.noiseVol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.decay + 0.02);
    registerCleanup(filter, gain);
}

/** Open hi-hat: longer bandpass noise burst at 7.5 kHz. */
function playOpenHiHat(state, now, vol) {
    const p = readParams('op_hihat');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(vol * p.noiseVol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.decay + 0.02);
    registerCleanup(filter, gain);
}

/** Shaker: bandpass noise with a quick attack envelope to simulate bead movement. */
function playShaker(state, now, vol) {
    const p = readParams('shaker');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(MIN_GAIN, now);
    gain.gain.linearRampToValueAtTime(vol * p.noiseVol, now + p.attack);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.decay + 0.02);
    registerCleanup(filter, gain);
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
    registerCleanup(osc, gain);
}

/**
 * Handclap — one person's clap. The key to realism is micro-transient structure:
 * the fingers/heel never land at exactly the same instant, so the "burst" layer
 * is a tight flutter of 2–4 sub-impacts fused within a few ms rather than one
 * clean hit. Layers:
 *   1. Burst flutter — 3 short bright impacts over ~6 ms, each with jittered
 *      centre frequency and a soft ~1 ms attack (a hard 0->peak step clicks).
 *   2. Cup resonance — the hollow "pop" of the cupped palms.
 *   3. Body — a low triangle for mass (below the pitch threshold).
 *   4. Tail — a short breath of room.
 * Per-hit frequency/decay jitter and independent noise read-offsets keep it
 * sounding like a person, not a loop byte — so the clap is live-only.
 */
function playClap(state, now, vol) {
    const p = readParams('clap');
    // Each layer carries `vol` itself and connects straight to the destination,
    // so every gain write stays <= vol.
    const dest = state.audioCtx.destination;

    // 1. Burst flutter — 3 sub-impacts over ~6 ms with decreasing energy.
    for (let i = 0; i < p.burstCount; i++) {
        const level = p.burstVol * Math.pow(0.62, i); // 0.8 -> 0.50 -> 0.31
        if (level <= 0) continue;
        const t = Math.max(now, now + i * p.burstSpacing);
        // Jitter the centre frequency and decay so the impacts don't
        // phase-reinforce into one louder burst.
        const freq = p.burstFreq * (1 + (Math.random() - 0.5) * p.burstJitterPct * 2);
        const decay = p.burstDecay * (1 + (Math.random() - 0.5) * 0.2);
        const noise = acquireNoiseSource(state);
        if (!noise) return;
        const filter = state.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, t);
        filter.Q.setValueAtTime(p.burstQ, t);
        const g = acquireGain(state);
        // Soft attack (a hard step clicks), then exponential decay.
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * level, t + 0.001);
        g.gain.exponentialRampToValueAtTime(MIN_GAIN, t + decay);
        noise.connect(filter); filter.connect(g); g.connect(dest);
        noise.start(t, randomNoiseOffset(state, decay + 0.02));
        noise.stop(t + decay + 0.02);
        registerCleanup(filter, g);
    }

    // 2. Cup resonance — the hollow "pop" of the cupped palms.
    if (p.cupVol > 0) {
        const cupNoise = acquireNoiseSource(state);
        if (cupNoise) {
            const cupFilter = state.audioCtx.createBiquadFilter();
            cupFilter.type = 'bandpass';
            cupFilter.frequency.setValueAtTime(p.cupFreq * (1 + (Math.random() - 0.5) * 0.1), now);
            cupFilter.Q.setValueAtTime(p.cupQ, now);
            const cg = acquireGain(state);
            cg.gain.setValueAtTime(0, now);
            cg.gain.linearRampToValueAtTime(vol * p.cupVol, now + 0.001);
            cg.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.cupDecay);
            cupNoise.connect(cupFilter); cupFilter.connect(cg); cg.connect(dest);
            cupNoise.start(now, randomNoiseOffset(state, p.cupDecay + 0.02));
            cupNoise.stop(now + p.cupDecay + 0.02);
            registerCleanup(cupFilter, cg);
        }
    }

    // 3. Body — a fixed low triangle for a hint of weight behind the smack.
    if (p.bodyVol > 0) {
        const osc = acquireOsc(state);
        const og = acquireGain(state);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(p.bodyFreq, now);
        og.gain.setValueAtTime(vol * p.bodyVol, now);
        og.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.bodyDecay);
        osc.connect(og); og.connect(dest);
        osc.start(now); osc.stop(now + p.bodyDecay);
        registerCleanup(osc, og);
    }

    // 4. Tail — a short breath of room, kept brief so it stays dry.
    if (p.tailVol > 0) {
        const tailNoise = acquireNoiseSource(state);
        if (tailNoise) {
            const tailFilter = state.audioCtx.createBiquadFilter();
            tailFilter.type = 'bandpass';
            tailFilter.frequency.setValueAtTime(p.tailFreq, now);
            tailFilter.Q.setValueAtTime(p.tailQ, now);
            const tg = acquireGain(state);
            tg.gain.setValueAtTime(MIN_GAIN, now);
            tg.gain.linearRampToValueAtTime(vol * p.tailVol, now + 0.006);
            tg.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.tailDecay);
            tailNoise.connect(tailFilter); tailFilter.connect(tg); tg.connect(dest);
            tailNoise.start(now, randomNoiseOffset(state, p.tailDecay + 0.02));
            tailNoise.stop(now + p.tailDecay + 0.02);
            registerCleanup(tailFilter, tg);
        }
    }
}

/** Agogo bell: sine oscillator, pitch varies by channel. */
function playAgogo(state, now, vol, channelName) {
    const p = readParams('agogo');
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = p.wave >= 1 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? p.freqA : p.freqB, now);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay);
    registerCleanup(osc, gain);
}

/** Crystal ping: high-frequency sine tone, pitch varies by channel. */
function playPing(state, now, vol, channelName) {
    const p = readParams('ping');
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? p.freqA : p.freqB, now);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay);
    registerCleanup(osc, gain);
}

/** Rimshot: short triangle oscillator click. */
function playRimshot(state, now, vol) {
    const p = readParams('rimshot');
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(p.freq, now);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay + 0.01);
    registerCleanup(osc, gain);
}

/** Woodblock: sine oscillator with a brief downward pitch sweep. */
function playWoodblock(state, now, vol) {
    const p = readParams('woodblock');
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(p.endFreq, now + p.sweepTime);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay + 0.02);
    registerCleanup(osc, gain);
}

/** Cowbell: two detuned square oscillators through a bandpass filter. */
function playCowbell(state, now, vol) {
    const p = readParams('cowbell');
    const osc1 = acquireOsc(state);
    const osc2 = acquireOsc(state);
    const gain = acquireGain(state);
    const filter = state.audioCtx.createBiquadFilter();
    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(p.freq1, now);
    osc2.frequency.setValueAtTime(p.freq2, now);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + p.decay); osc2.stop(now + p.decay);
    registerCleanup(osc1, filter, gain);
    registerCleanup(osc2, filter, gain);
}

/**
 * Bongo bell (campana) single strike. Folded/welded sheet steel doesn't stretch
 * or ring a clean harmonic series — no pitch bend, loud inharmonic overtones,
 * and a sharp thick-stick transient. The Boca (open edge) rings long; the
 * Centro (flat center) is dry and pitched up.
 */
function playCowbellBoca(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'cowbell_boca', 0);
}
function playCowbellCentro(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'cowbell_centro', 0);
}

/** Claves: two slightly detuned sines creating a beat frequency for a wooden click. */
function playClaves(state, now, vol) {
    const p = readParams('claves');
    const osc1 = acquireOsc(state);
    const osc2 = acquireOsc(state);
    const gain = acquireGain(state);
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(p.freq1, now);
    osc2.frequency.setValueAtTime(p.freq2, now);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc1.connect(gain); osc2.connect(gain); gain.connect(state.audioCtx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + p.decay); osc2.stop(now + p.decay);
    registerCleanup(osc1, gain);
    registerCleanup(osc2, gain);
}

/**
 * Palitos (cáscara / catá): hardwood dowel on solid wood. No membrane, so no
 * pitch bend — a flat oscillator is what sounds rigid. The loud, inharmonic
 * wood overtones compete with the fundamental, and a high-Q noise tick carries
 * the stick attack.
 */
function playPalitos(state, now, vol) {
    const p = readParams('palitos');
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    // 1. Fundamental (sine) — flat, rigid.
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.baseFreq, now);
    gain.gain.setValueAtTime(p.bodyVol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.bodyDecay);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + p.bodyDecay);
    registerCleanup(osc, gain);

    // 2. Inharmonic wood overtones (triangle), competing with the fundamental.
    addBongoOvertone(state, masterGain, now, p.baseFreq, 1.0, 0.001, p.overRatio1, p.overVol1, p.overDecay1);
    if (p.overRatio2) {
        addBongoOvertone(state, masterGain, now, p.baseFreq, 1.0, 0.001, p.overRatio2, p.overVol2, p.overDecay2);
    }

    // 3. Stick impact transient (high-Q bandpass noise).
    const noise = acquireNoiseSource(state);
    if (noise && p.slapVol > 0) {
        const noiseFilter = state.audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(p.slapFreq, now);
        noiseFilter.Q.setValueAtTime(p.slapQ, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(p.slapVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.slapDecay);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
        noise.stop(now + p.slapDecay + 0.02);
        registerCleanup(noiseFilter, noiseGain);
    }

    masterGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + Math.max(p.bodyDecay, p.overDecay1) + 0.05);
}

/** Tambourine: bandpass noise for jingle + sine ring for body. */
function playTambourine(state, now, vol) {
    const p = readParams('tambourine');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(p.noiseFreq, now);
    noiseFilter.Q.setValueAtTime(p.noiseQ, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * p.noiseVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.noiseDecay);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.noiseDecay + 0.02);
    registerCleanup(noiseFilter, noiseGain);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.bodyFreq, now);
    oscGain.gain.setValueAtTime(vol * p.bodyVol, now);
    oscGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.bodyDecay);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.bodyDecay);
    registerCleanup(osc, oscGain);
}

/**
 * Shared conga open-tone renderer. Reads the given instrument's params and
 * builds the fundamental + two shell/skin overtones + flesh-impact transient.
 *
 * Layer behaviour worth noting:
 *  - The fundamental (sine) swells for `bodyVol` with a `bodyDecay` length,
 *    while the overtones (triangle — the gritty rawhide modes) can each carry
 *    an absolute decay. The overtones therefore read as complex and wooden at
 *    the strike, leaving a purer sine hum as they die off.
 *  - `shellVol1`/`shellVol2` scale the overtone envelope, so a zero value
 *    truly chokes that mode instead of merely ducking it.
 */
function playCongaVariant(state, now, vol, channelName, key, channelOffset) {
    const p = instrumentData[key].params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const baseFreq = channelName.startsWith('A') ? p.baseFreq + channelOffset : p.baseFreq;
    const decay = p.bodyDecay;
    const bendTime = p.pitchBendTime ?? 0.035;

    // 1. Fundamental (sine) — the deep, clean shell hum.
    const osc1 = acquireOsc(state);
    const gain1 = acquireGain(state);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * p.pitchBend, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + bendTime);
    gain1.gain.setValueAtTime(p.bodyVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start(now); osc1.stop(now + decay);
    registerCleanup(osc1, gain1);

    // 2. Shell/skin overtones (triangle) — gritty, steep drop-off.
    const atk = p.attackTime ?? 0;
    createCongaTone(state, baseFreq, p.shellVol1, p.shellRatio1, masterGain, now, p.shellDecay1, p.pitchBend, bendTime, atk);
    if (p.shellRatio2) {
        createCongaTone(state, baseFreq, p.shellVol2, p.shellRatio2, masterGain, now, p.shellDecay2, p.pitchBend, bendTime, atk);
    }

    // 3. Flesh-on-cowhide transient.
    if (p.slapVol > 0) {
        createCongaSlapNoise(state, masterGain, now, p.slapDecay, p.slapFreq, p.slapQ);
    }

    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay + 0.05);
}

/** Conga low (Tumba): deep open tone with a slow, heavy pitch drop. */
function playCongaLow(state, now, vol, channelName) {
    playCongaVariant(state, now, vol, channelName, 'conga_low', 15);
}
/** Conga middle (Conga): open tone between the tumba and the quinto. */
function playCongaMiddle(state, now, vol, channelName) {
    playCongaVariant(state, now, vol, channelName, 'conga_middle', 15);
}
/** Conga high (Quinto): brightest open tone, cuts through the mix. */
function playCongaHigh(state, now, vol, channelName) {
    playCongaVariant(state, now, vol, channelName, 'conga_high', 15);
}

/**
 * Ewe ensemble (Agbadza/Gahu): carved solid-log drums with pegged skin. The
 * smaller drums are struck with wooden sticks (bright, minimal bend, sharp
 * attack) while the master drum is played hand-and-stick (deep, long bend).
 * They share the bongo open-tone renderer, so no per-channel offset.
 */
function playEweKaganu(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_kaganu', 0);
}
/** Ewe Kidi: mid drum, heavier stick strikes drawing more wood resonance. */
function playEweKidi(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_kidi', 0);
}
/** Ewe Kidi stick press: dry, articulate pitched doink that kills sustain. */
function playEweKidiPress(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_kidi_press', 0);
}
/** Ewe Sogo: wide low-mid drum, heavy open hand tone. */
function playEweSogo(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_sogo', 0);
}
/** Ewe Sogo stick press: darker, heavier staccato anchor than the Kidi press. */
function playEweSogoPress(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_sogo_press', 0);
}
/** Ewe Atsimevu: the massive master drum, booming hand strike to the center. */
function playEweAtsimevu(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_atsimevu', 0);
}
/** Ewe Atsimevu stick: the right-hand wooden stick strike — sharper, less bend. */
function playEweAtsimevuStick(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'ewe_atsimevu_stick', 0);
}

/**
 * Axatse (Ewe gourd rattle): beads are woven into an external net, so the
 * sound is a cascade of noise, not a pitched note. Overtones are zeroed; the
 * body is just a hollow gourd thump and the noise decay is what carries the
 * bead wash. Shares the bongo renderer with no channel offset.
 */
function playAxatsePa(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'axatse_pa', 0);
}
function playAxatseTi(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'axatse_ti', 0);
}

/**
 * Conga bass (palma/bajo): a flat palm strike to the dead center. Excites the
 * primary symmetric mode while suppressing the asymmetric edge modes, hence the
 * deep pitch bend, long sustain, and near-zero overtones. Uses no channel
 * offset — a centered strike has no edge to differences between wheels.
 */
function playCongaLowBass(state, now, vol, channelName) {
    playCongaVariant(state, now, vol, channelName, 'conga_low_bass', 0);
}
/** Conga middle bass (Tres Dos): anchors the pattern without muddying the low end. */
function playCongaMiddleBass(state, now, vol, channelName) {
    playCongaVariant(state, now, vol, channelName, 'conga_middle_bass', 0);
}
/** Conga high bass (Quinto): tight, hollow center punch. */
function playCongaHighBass(state, now, vol, channelName) {
    playCongaVariant(state, now, vol, channelName, 'conga_high_bass', 0);
}

/**
 * Conga press (Tumbao mute): the open-tone renderer, but the hand stays flat on
 * the head — spinning off the same params with the overtones choked, the decay
 * crushed, and a dark blunt impact instead of a bright slap.
 */
function playCongaPressVariant(state, now, vol, channelName, key, channelOffset) {
    playCongaVariant(state, now, vol, channelName, key, channelOffset);
}

/** Conga low press (Tumba). */
function playCongaLowPress(state, now, vol, channelName) {
    playCongaPressVariant(state, now, vol, channelName, 'conga_low_press', 10);
}
/** Conga middle press (Tres Dos). */
function playCongaMiddlePress(state, now, vol, channelName) {
    playCongaPressVariant(state, now, vol, channelName, 'conga_middle_press', 10);
}
/** Conga high press (Quinto). */
function playCongaHighPress(state, now, vol, channelName) {
    playCongaPressVariant(state, now, vol, channelName, 'conga_high_press', 15);
}

/** Conga slap: sharp high-frequency skin crack with resonant rim ring and heavy noise. */
function playCongaSlap(state, now, vol, channelName) {
    const p = instrumentData.conga_slap.params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    // Muted body — a hint of the drum's pitch, then the crack takes over.
    createCongaTone(state, p.baseFreq, p.bodyVol, p.overRatio1 ?? 1.5, masterGain, now, p.bodyDecay, 1.15, 0.03);
    createCongaSlapNoise(state, masterGain, now, p.slapDecay, p.slapFreq, p.slapQ);

    masterGain.gain.exponentialRampToValueAtTime(0.001, now + p.bodyDecay + 0.05);
}

/**
 * Shared ringing-slap renderer (galleta/abierto). The palm chokes the
 * fundamental while the cupped fingertips whip the rim: body is small and dies
 * fast, the overtones are boosted above the body, and the high-Q transient
 * dominates. Overtones optionally ramp in over `attackTime` so the crack is
 * heard a fraction before the shell resonance blossoms.
 */
function playCongaSlapVariant(state, now, vol, channelName, key, channelOffset) {
    const p = instrumentData[key].params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const baseFreq = channelName.startsWith('A') ? p.baseFreq + channelOffset : p.baseFreq;
    const bendTime = p.pitchBendTime ?? 0.015;

    // 1. Choked fundamental (sine) — the palm traps the deep hum.
    const osc1 = acquireOsc(state);
    const gain1 = acquireGain(state);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * p.pitchBend, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + bendTime);
    gain1.gain.setValueAtTime(p.bodyVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + p.bodyDecay);
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start(now); osc1.stop(now + p.bodyDecay);
    registerCleanup(osc1, gain1);

    // 2. Galleta overtones (triangle) — louder than the body, ringing hard.
    const atk = p.attackTime ?? 0;
    createCongaTone(state, baseFreq, p.shellVol1, p.shellRatio1, masterGain, now, p.shellDecay1, p.pitchBend, bendTime, atk);
    if (p.shellRatio2) {
        createCongaTone(state, baseFreq, p.shellVol2, p.shellRatio2, masterGain, now, p.shellDecay2, p.pitchBend, bendTime, atk);
    }

    // 3. The crack.
    createCongaSlapNoise(state, masterGain, now, p.slapDecay, p.slapFreq, p.slapQ);

    masterGain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(p.bodyDecay, p.shellDecay1) + 0.05);
}

/** Conga low slap (Tumba): heavy explosive pop with a long shell ring. */
function playCongaLowSlap(state, now, vol, channelName) {
    playCongaSlapVariant(state, now, vol, channelName, 'conga_low_slap', 10);
}
/** Conga middle slap (Tres Dos): warm mid-range crack. */
function playCongaMiddleSlap(state, now, vol, channelName) {
    playCongaSlapVariant(state, now, vol, channelName, 'conga_middle_slap', 10);
}
/** Conga high slap (Quinto): loudest, most piercing stroke in the ensemble. */
function playCongaHighSlap(state, now, vol, channelName) {
    playCongaSlapVariant(state, now, vol, channelName, 'conga_high_slap', 15);
}

/**
 * Helper: synthesizes one triangle overtone for a conga open tone, with its own
 * initial pitch bend and an envelope scaled by `volume` (0 chokes the mode).
 * `attackTime` optionally ramps the overtone in from silence so the initial
 * noise crack is heard before the shell resonance blossoms.
 */
function createCongaTone(state, baseFreq, volume, ratio, target, startTime, duration, pitchBendFactor, bendTime, attackTime = 0) {
    if (!(volume > 0) || !(ratio > 0) || !(duration > 0)) return;
    const freq = baseFreq * ratio;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * pitchBendFactor, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + bendTime);
    if (attackTime > 0 && attackTime < duration) {
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    } else {
        gain.gain.setValueAtTime(volume, startTime);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(target);
    osc.start(startTime);
    osc.stop(startTime + duration);
    registerCleanup(osc, gain);
}

/** Helper: generates the flesh-impact/slap transient through a bandpass filter. */
function createCongaSlapNoise(state, target, startTime, duration, filterFreq = 1400, q = 4.0) {
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(q, startTime);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(1.0, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    noise.start(startTime);
}

/** Bongo low: short sine sweep, frequency varies by channel. */
/** One inharmonic membrane overtone (triangle) with a short initial pitch bend. */
function addBongoOvertone(state, dest, now, baseFreq, pitchBend, bendTime, ratio, level, length) {
    if (!(level > 0) || !(ratio > 0) || !(length > 0)) return;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * ratio * pitchBend, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * ratio, now + bendTime);
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    osc.connect(gain); gain.connect(dest);
    osc.start(now); osc.stop(now + length);
    registerCleanup(osc, gain);
}

/**
 * Shared bongo renderer. Reads the given instrument's params and builds the
 * fundamental + two membrane overtones + impact-noise layers. `channelName`
 * only affects the base pitch via the per-instrument offsets below.
 */
function playBongoVariant(state, now, vol, channelName, key, channelOffset) {
    const p = instrumentData[key].params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    const baseFreq = channelName.startsWith('A') ? p.baseFreq + channelOffset : p.baseFreq;
    const decay = p.bodyDecay;
    const bendTime = p.pitchBendTime ?? 0.03;

    // 1. Fundamental (sine) — slight pitch drop on impact.
    const osc1 = acquireOsc(state);
    const gain1 = acquireGain(state);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * p.pitchBend, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + bendTime);
    gain1.gain.setValueAtTime(p.bodyVol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start(now); osc1.stop(now + decay);
    registerCleanup(osc1, gain1);

    // 2. Membrane overtones (inharmonic Bessel ratios), each with its own
    // absolute decay time (seconds) so they damp faster than the fundamental.
    // First-overtone keys are numbered (`overRatio1`) in most families but the
    // original bongos use the unnumbered form (`overRatio`) — accept both.
    const overRatio1 = p.overRatio1 ?? p.overRatio;
    const overVol1 = p.overVol1 ?? p.overVol;
    const overDecay1 = p.overDecay1 ?? p.overDecay;
    addBongoOvertone(state, masterGain, now, baseFreq, p.pitchBend, bendTime, overRatio1, overVol1, overDecay1);
    if (p.overRatio2) {
        addBongoOvertone(state, masterGain, now, baseFreq, p.pitchBend, bendTime, p.overRatio2, p.overVol2, p.overDecay2);
    }

    // 3. Hand impact transient (bandpass noise)
    const noise = acquireNoiseSource(state);
    if (noise && p.noiseVol > 0) {
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

/** Bongo low (Hembra) open tone: tight profile with two membrane overtones. */
function playBongoLow(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'bongo_low', 15);
}
/** Bongo high (Macho) open tone: tighter, higher-pitched variant. */
function playBongoHigh(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'bongo_high', 29);
}
/** Bongo high slap (Macho Golpe Seco): choked fundamental, loud resonant pop. */
function playBongoHighSlap(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'bongo_high_slap', 29);
}
/** Bongo low mute (Hembra Tapao): muffled thud with no overtones or snap. */
function playBongoLowMute(state, now, vol, channelName) {
    playBongoVariant(state, now, vol, channelName, 'bongo_low_mute', 15);
}

/** Maraca: bandpass noise with amplitude modulation to simulate shaking. */
function playMaraca(state, now, vol) {
    const p = readParams('maraca');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(MIN_GAIN, now);
    for (let i = 0; i < p.grains; i++) {
        const t = now + i * p.grainRate;
        gain.gain.linearRampToValueAtTime(vol * p.vol, t);
        gain.gain.linearRampToValueAtTime(MIN_GAIN, t + p.grainDecay);
    }
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.grains * p.grainRate + p.grainDecay + 0.02);
    registerCleanup(filter, gain);
}

/** Crash cymbal: full highpass noise with sustained sine wash for resonance. */
function playCrash(state, now, vol) {
    const p = readParams('crash');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * p.noiseVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.noiseDecay);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.noiseDecay + 0.02);
    registerCleanup(filter, noiseGain);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.oscFreq, now);
    oscGain.gain.setValueAtTime(vol * p.oscVol, now);
    oscGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.oscDecay);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.oscDecay);
    registerCleanup(osc, oscGain);
}

/** Ride cymbal: bandpass noise ping + sustained sine bell tone. */
function playRide(state, now, vol) {
    const p = readParams('ride');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * p.noiseVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.noiseDecay);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.noiseDecay + 0.02);
    registerCleanup(filter, noiseGain);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.oscFreq, now);
    oscGain.gain.setValueAtTime(vol * p.oscVol, now);
    oscGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.oscDecay);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.oscDecay);
    registerCleanup(osc, oscGain);
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
    registerCleanup(subOsc, subGain);

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
    registerCleanup(skinOsc, skinGain);

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
    registerCleanup(osc1, gain1);

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
    registerCleanup(osc2, gain2);

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
    registerCleanup(osc, oscGain);

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

/** Castanets: short bandpass noise burst + resonant wood tone. */
function playCastanets(state, now, vol) {
    const p = readParams('castanets');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.noiseFreq, now);
    filter.Q.setValueAtTime(p.noiseQ, now);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(vol * p.noiseVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.noiseDecay);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.noiseDecay + 0.02);
    registerCleanup(filter, noiseGain);

    const osc = acquireOsc(state);
    const oscGain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.oscFreq, now);
    oscGain.gain.setValueAtTime(vol * p.oscVol, now);
    oscGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.oscDecay);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.oscDecay);
    registerCleanup(osc, oscGain);
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
    registerCleanup(subOsc, subGain);

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
    registerCleanup(midOsc, midGain);
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
    registerCleanup(osc, oscGain);

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

/** Foot tap: very short bandpass noise click. */
function playFootTap(state, now, vol) {
    const p = readParams('foot_tap');
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    const gain = acquireGain(state);
    gain.gain.setValueAtTime(vol * p.noiseVol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
    noise.stop(now + p.decay + 0.02);
    registerCleanup(filter, gain);
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
    registerCleanup(osc, oscGain);
}

/**
 * Batá open (enú) tone. Four layers:
 *  1. Root sine — subtle pitch bend; the tight tension straps barely deflect.
 *  2. Inharmonic shell/skin overtone (Bessel ratio).
 *  3. Coupled opposite head (chachá) — ramps up from silence over
 *     `chachaAttack` to mimic the air column traversing the hourglass, then
 *     swells and sustains.
 *  4. Hand-on-fardela transient.
 */
function playBataTonalDrum(state, now, vol, { baseFreq, pitchBend, pitchBendTime, bodyVol, bodyDecay, overRatio1, overVol1, overDecay1, chachaRatio, chachaVol, chachaAttack, chachaDecay, slapFreq, slapQ, slapVol, slapDecay }) {
    const masterGain = acquireGain(state);
    masterGain.connect(state.audioCtx.destination);

    // 1. Root — heavy fundamental with a subtle pitch settle.
    const rootOsc = acquireOsc(state);
    const rootGain = acquireGain(state);
    rootOsc.type = 'sine';
    rootOsc.frequency.setValueAtTime(baseFreq * pitchBend, now);
    rootOsc.frequency.exponentialRampToValueAtTime(baseFreq, now + pitchBendTime);
    rootGain.gain.setValueAtTime(vol * bodyVol, now);
    rootGain.gain.exponentialRampToValueAtTime(0.001, now + bodyDecay);
    rootOsc.connect(rootGain); rootGain.connect(masterGain);
    rootOsc.start(now); rootOsc.stop(now + bodyDecay + 0.05);
    registerCleanup(rootOsc, rootGain);

    // 2. Shell/skin overtone — inharmonic Bessel ratio, fast decay.
    if (overVol1 > 0) {
        const overtoneOsc = acquireOsc(state);
        const overtoneGain = acquireGain(state);
        overtoneOsc.type = 'sine';
        overtoneOsc.frequency.setValueAtTime(baseFreq * overRatio1, now);
        overtoneGain.gain.setValueAtTime(vol * overVol1, now);
        overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + overDecay1);
        overtoneOsc.connect(overtoneGain); overtoneGain.connect(masterGain);
        overtoneOsc.start(now); overtoneOsc.stop(now + overDecay1 + 0.05);
        registerCleanup(overtoneOsc, overtoneGain);
    }

    // 3. Chachá sympathetic — delayed swell from the coupled head. The air
    // travel time is what makes `chachaAttack` the realism-defining control.
    if (chachaVol > 0) {
        const chachaOsc = acquireOsc(state);
        const chachaGain = acquireGain(state);
        chachaOsc.type = 'sine';
        chachaOsc.frequency.setValueAtTime(baseFreq * chachaRatio, now);
        chachaGain.gain.setValueAtTime(0.0001, now);
        chachaGain.gain.linearRampToValueAtTime(vol * chachaVol, now + chachaAttack);
        chachaGain.gain.exponentialRampToValueAtTime(0.001, now + chachaDecay);
        chachaOsc.connect(chachaGain); chachaGain.connect(masterGain);
        chachaOsc.start(now); chachaOsc.stop(now + chachaDecay + 0.05);
        registerCleanup(chachaOsc, chachaGain);
    }

    // 4. Fardela impact — blunt, heavy thwack (low Q, no bright ripples).
    if (slapVol > 0) {
        createBataSlap(state, vol * slapVol, masterGain, now, slapDecay, slapFreq, slapQ);
    }
}

/** Reads an instrument's params from instrumentData into a plain object. */
function readParams(key) {
    return instrumentData[key].params.reduce((a, {k, v}) => { a[k] = v; return a; }, {});
}

/** Batá low (Iyá): largest drum — deep, singing enú with fifth chachá. */
function playBataLow(state, now, vol) {
    playBataTonalDrum(state, now, vol, readParams('bata_low'));
}

/** Batá middle (Itótele): mid-sized drum — warm tone, octave chachá. */
function playBataMiddle(state, now, vol) {
    playBataTonalDrum(state, now, vol, readParams('bata_middle'));
}

/** Batá high (Okónkolo): smallest drum — bright tone, fifth chachá. */
function playBataHigh(state, now, vol) {
    playBataTonalDrum(state, now, vol, readParams('bata_high'));
}

/**
 * Batá chachá strike (small head). Unlike the enú tone the chachá has no
 * fardela, so it is drier and sharper. It still has a few coupled behaviours
 * worth modelling:
 *   1. Body  — a fast sine fundamental (with a short tension-spike bend).
 *   2. Overtones — three inharmonic skin/shell modes, quieter by ratio.
 *   3. Coupling — the small head can't drive much air, but a little low
 *      sympathetic energy still reaches the opposite head; a micro-delayed,
 *      smoothed sine at the enú fundamental adds that low "bloom".
 *   4. Attack — a bright rawhide crack.
 * All layers are parameter-driven so the balance can be tuned per drum.
 */
function playBataChacha(state, now, vol, p) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    // 1. Body — fast fundamental.
    const bodyOsc = acquireOsc(state);
    const bodyGain = acquireGain(state);
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(p.baseFreq * p.pitchBend, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(p.baseFreq, now + p.pitchBendTime);
    bodyGain.gain.setValueAtTime(p.bodyVol, now);
    bodyGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.bodyDecay);
    bodyOsc.connect(bodyGain); bodyGain.connect(masterGain);
    bodyOsc.start(now); bodyOsc.stop(now + p.bodyDecay);
    registerCleanup(bodyOsc, bodyGain);

    // 2. Inharmonic skin/shell overtones (triangle), each quieter by ratio.
    addBataChachaOvertone(state, masterGain, now, p.baseFreq, p.overRatio1, p.overVol1, p.overDecay1);
    addBataChachaOvertone(state, masterGain, now, p.baseFreq, p.overRatio2, p.overVol2, p.overDecay2);
    addBataChachaOvertone(state, masterGain, now, p.baseFreq, p.overRatio3, p.overVol3, p.overDecay3);

    // 3. Enú coupling — low sympathetic bloom, micro-delayed and smoothed.
    if (p.couplingVol > 0) {
        const cDelay = now + p.couplingDelay;
        const cOsc = acquireOsc(state);
        const cGain = acquireGain(state);
        cOsc.type = 'sine';
        cOsc.frequency.setValueAtTime(p.couplingFreq, cDelay);
        cGain.gain.setValueAtTime(0, cDelay);
        cGain.gain.linearRampToValueAtTime(p.couplingVol, cDelay + p.couplingAttack);
        cGain.gain.exponentialRampToValueAtTime(MIN_GAIN, cDelay + p.couplingDecay);
        cOsc.connect(cGain); cGain.connect(masterGain);
        cOsc.start(cDelay); cOsc.stop(cDelay + p.couplingDecay + 0.05);
        registerCleanup(cOsc, cGain);
    }

    // 4. Attack — rawhide crack.
    if (p.slapVol > 0) {
        createBataSlap(state, p.slapVol, masterGain, now, p.slapDecay, p.slapFreq, p.slapQ);
    }

    const maxTail = Math.max(p.bodyDecay, p.overDecay1, p.overDecay2, p.overDecay3,
        p.couplingDelay + p.couplingDecay);
    masterGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + maxTail + 0.05);
}

/** One inharmonic chachá overtone (triangle), skipped when silent. */
function addBataChachaOvertone(state, dest, now, baseFreq, ratio, level, decay) {
    if (!(level > 0) || !(ratio > 0) || !(decay > 0)) return;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * ratio, now);
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + decay);
    osc.connect(gain); gain.connect(dest);
    osc.start(now); osc.stop(now + decay);
    registerCleanup(osc, gain);
}

/** Batá low chachá (Iyá small head) — tuned to the enú's 1.5 coupling (225 Hz). */
function playBataLowSlap(state, now, vol) {
    playBataChacha(state, now, vol, readParams('bata_low_slap'));
}

/** Batá middle chachá (Itótele small head) — tuned to the enú's 1.6 coupling (352 Hz). */
function playBataMiddleSlap(state, now, vol) {
    playBataChacha(state, now, vol, readParams('bata_middle_slap'));
}

/** Batá high chachá (Okónkolo small head) — tuned to the enú's octave (600 Hz). */
function playBataHighSlap(state, now, vol) {
    playBataChacha(state, now, vol, readParams('bata_high_slap'));
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
    registerCleanup(bodyOsc, bodyGain);

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
        registerCleanup(osc, gain);
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
    registerCleanup(couplingOsc, couplingGain);
}

/** Batá low press (Iyá enú): heavy pitched "doink", choked by the fardela. */
function playBataLowPress(state, now, vol) {
    playBataPress(state, now, vol, readParams('bata_low_press'));
}

/** Batá middle press (Itótele enú): tighter, more articulate muted syncopation. */
function playBataMiddlePress(state, now, vol) {
    playBataPress(state, now, vol, readParams('bata_middle_press'));
}

/**
 * Batá press (muff). Same four-layer architecture as the open enú, but the
 * hand traps the skin against the fardela: a sharp pitch "doink" spikes local
 * tension, the sound is choked instantly, and the trapped head cannot push
 * enough air through the hourglass to excite the chachá — so the overtone and
 * coupling layers are typically zeroed out in the instrument's params.
 */
function playBataPress(state, now, vol, p) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    // 1. Body — sharp tension-spike doink, choked almost immediately.
    const bodyOsc = acquireOsc(state);
    const bodyGain = acquireGain(state);
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(p.baseFreq * p.pitchBend, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(p.baseFreq, now + p.pitchBendTime);
    bodyGain.gain.setValueAtTime(p.bodyVol, now);
    bodyGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.bodyDecay);
    bodyOsc.connect(bodyGain); bodyGain.connect(masterGain);
    bodyOsc.start(now); bodyOsc.stop(now + p.bodyDecay);
    registerCleanup(bodyOsc, bodyGain);

    // 2. Overtone — deadened by the pressed hand (skipped when zeroed).
    if (p.overVol1 > 0) {
        const overOsc = acquireOsc(state);
        const overGain = acquireGain(state);
        overOsc.type = 'triangle';
        overOsc.frequency.setValueAtTime(p.baseFreq * p.overRatio1, now);
        overGain.gain.setValueAtTime(p.overVol1, now);
        overGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.overDecay1);
        overOsc.connect(overGain); overGain.connect(masterGain);
        overOsc.start(now); overOsc.stop(now + p.overDecay1);
        registerCleanup(overOsc, overGain);
    }

    // 3. Chachá coupling — dead, because the trapped skin can't move air.
    if (p.chachaVol > 0) {
        const chachaOsc = acquireOsc(state);
        const chachaGain = acquireGain(state);
        chachaOsc.type = 'sine';
        chachaOsc.frequency.setValueAtTime(p.baseFreq * p.chachaRatio, now);
        chachaGain.gain.setValueAtTime(MIN_GAIN, now);
        chachaGain.gain.linearRampToValueAtTime(p.chachaVol, now + p.chachaAttack);
        chachaGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.chachaDecay);
        chachaOsc.connect(chachaGain); chachaGain.connect(masterGain);
        chachaOsc.start(now); chachaOsc.stop(now + p.chachaDecay);
        registerCleanup(chachaOsc, chachaGain);
    }

    // 4. Attack — dark, muffled flesh-into-paste transient.
    if (p.slapVol > 0) {
        const noise = acquireNoiseSource(state);
        if (noise) {
            const noiseFilter = state.audioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(p.slapFreq, now);
            noiseFilter.Q.setValueAtTime(p.slapQ, now);
            const noiseGain = acquireGain(state);
            noiseGain.gain.setValueAtTime(p.slapVol, now);
            noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.slapDecay);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
            noise.start(now);
            noise.stop(now + p.slapDecay + 0.02);
            registerCleanup(noiseFilter, noiseGain);
        }
    }
}

/** Helper: generates a hand-impact slap transient using white noise through a high-pass filter. */
function createBataSlap(state, volume, targetNode, startTime, duration, filterFreq = 1200, q = 1.0) {
    const noise = acquireNoiseSource(state);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(filterFreq, startTime);
    noiseFilter.Q.setValueAtTime(q, startTime);
    const noiseGain = acquireGain(state);
    noiseGain.gain.setValueAtTime(volume, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, startTime + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(targetNode);
    noise.start(startTime);
    // The noise buffer is 1 s long; stop it at the end of the transient rather
    // than letting the source linger in the graph for the rest of the buffer.
    noise.stop(startTime + duration + 0.02);
    registerCleanup(noiseFilter, noiseGain);
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
    registerCleanup(cavityOsc, cavityGain);

    const woodOsc = acquireOsc(state);
    const woodGain = acquireGain(state);
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(120, now);
    woodGain.gain.setValueAtTime(0.4, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    woodOsc.connect(woodGain); woodGain.connect(masterGain);
    woodOsc.start(now); woodOsc.stop(now + 0.12);
    registerCleanup(woodOsc, woodGain);

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
    registerCleanup(edgeOsc, edgeGain);

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
    registerCleanup(edgeOsc, edgeGain);

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
/** Cabasa / Shekere: clustered bead rattle with a hollow body resonance. */
function playCabasaShekere(state, now, vol) {
    const p = readParams('cabasa_shekere');
    const bodyFilter = state.audioCtx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(p.filterFreq, now);
    bodyFilter.Q.setValueAtTime(p.filterQ, now);
    bodyFilter.connect(state.audioCtx.destination);

    for (let grainIndex = 0; grainIndex < p.grains; grainIndex++) {
        const grainStart = now + grainIndex * p.grainRate;
        const noise = acquireNoiseSource(state);
        if (!noise) return;
        const grainGain = acquireGain(state);
        const accent = grainIndex % 3 === 0 ? p.accentVol : p.grainVol;
        grainGain.gain.setValueAtTime(vol * accent, grainStart);
        grainGain.gain.exponentialRampToValueAtTime(MIN_GAIN, grainStart + p.grainDecay);
        noise.connect(grainGain);
        grainGain.connect(bodyFilter);
        noise.start(grainStart);
        noise.stop(grainStart + p.grainDecay + 0.02);
        registerCleanup(grainGain);
    }
}

/**
 * Iron bell (gankogui) single strike. Folded/welded sheet iron doesn't stretch
 * or ring a clean harmonic series: no pitch bend, loud inharmonic overtones
 * that sustain almost as long as the fundamental, and a sharp stick transient.
 */
function playGankoguiBell(state, now, vol, p) {
    const masterGain = acquireGain(state);
    masterGain.gain.setValueAtTime(vol, now);
    masterGain.connect(state.audioCtx.destination);

    // 1. Rigid iron fundamental — absolutely flat.
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.baseFreq, now);
    gain.gain.setValueAtTime(p.bodyVol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.bodyDecay);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(now); osc.stop(now + p.bodyDecay);
    registerCleanup(osc, gain);

    // 2. Clashing inharmonic overtones, nearly as loud as the root.
    addBongoOvertone(state, masterGain, now, p.baseFreq, 1.0, 0.001, p.overRatio1, p.overVol1, p.overDecay1);
    if (p.overRatio2) {
        addBongoOvertone(state, masterGain, now, p.baseFreq, 1.0, 0.001, p.overRatio2, p.overVol2, p.overDecay2);
    }

    // 3. Wood-on-iron stick transient.
    const noise = acquireNoiseSource(state);
    if (noise && p.noiseVol > 0) {
        const noiseFilter = state.audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(p.noiseFreq, now);
        noiseFilter.Q.setValueAtTime(p.noiseQ, now);
        const noiseGain = acquireGain(state);
        noiseGain.gain.setValueAtTime(p.noiseVol, now);
        noiseGain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.noiseDecay);
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
        noise.start(now);
        noise.stop(now + p.noiseDecay + 0.02);
        registerCleanup(noiseFilter, noiseGain);
    }
}

/** Gankogui low bell: the deep parent bell with a raw iron edge. */
function playGankoguiLow(state, now, vol) {
    playGankoguiBell(state, now, vol, readParams('gankogui_low'));
}
/** Gankogui high bell: the smaller, piercing child bell. */
function playGankoguiHigh(state, now, vol) {
    playGankoguiBell(state, now, vol, readParams('gankogui_high'));
}

/** Triangle: bright metallic ring with a pure sustained decay. */
function playTriangle(state, now, vol) {
    const p = readParams('triangle');
    createBellPartial(state, p.freq1, vol * p.vol1, p.decay1, true, now);
    createBellPartial(state, p.freq2, vol * p.vol2, p.decay2, false, now);
}

/** Helper: one inharmonic partial (triangle fundamental or sine upper) for a bell/triangle. */
function createBellPartial(state, frequency, volume, duration, triangle, startTime) {
    if (!(volume > 0) || !(duration > 0)) return;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    osc.type = triangle ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, startTime + duration);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(startTime); osc.stop(startTime + duration);
    registerCleanup(osc, gain);
}

/** Guiro scraper: stepped ratchet of short filtered-noise ridges. */
function playGuiro(state, now, vol) {
    const p = readParams('guiro');
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(p.filterFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    filter.connect(state.audioCtx.destination);

    for (let ridgeIndex = 0; ridgeIndex < p.ridges; ridgeIndex++) {
        const ridgeStart = now + ridgeIndex * p.ridgeRate;
        const noise = acquireNoiseSource(state);
        if (!noise) return;
        const ridgeGain = acquireGain(state);
        const accent = ridgeIndex === 0 || ridgeIndex === p.ridges - 1 ? p.accentVol : p.ridgeVol;
        ridgeGain.gain.setValueAtTime(vol * accent, ridgeStart);
        ridgeGain.gain.exponentialRampToValueAtTime(MIN_GAIN, ridgeStart + p.ridgeDecay);
        noise.connect(ridgeGain);
        ridgeGain.connect(filter);
        noise.start(ridgeStart);
        noise.stop(ridgeStart + p.ridgeDecay + 0.02);
        registerCleanup(ridgeGain);
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
    registerCleanup(osc, gain);

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
    const p = readParams('temple_block');
    const baseFreq = channelName.startsWith('A') ? p.freqA : p.freqB;
    const osc = acquireOsc(state);
    const gain = acquireGain(state);
    const filter = state.audioCtx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * p.pitchBend, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + p.bendTime);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.Q.setValueAtTime(p.filterQ, now);
    gain.gain.setValueAtTime(vol * p.vol, now);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + p.decay);
    osc.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + p.decay + 0.01);
    registerCleanup(osc, filter, gain);
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
    registerCleanup(osc, filter, gain);

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

function acquireGain(state) { return state.audioCtx.createGain(); }

// ── Offline pre-render cache ────────────────────────────────────────────
// Live synthesis creates 3-6 nodes per hit (oscillators, gains, filters, all
// connected per hit), which on low-end devices competes with rAF and produces
// audible/visible jitter. Every instrument's parameters are static, so each
// one (per A/B channel variant) is rendered once at unit volume into an
// OfflineAudioContext; a live hit then plays that buffer through a single
// gain node — two nodes instead of three to six, with no per-hit automation.
// Live synthesis remains the fallback: it runs while the offline render is
// pending and permanently if rendering fails.
const PRERENDER_SECONDS = 3;
// variant -> { buffer, duration } | null (null = live-only). `duration` is the
// buffer's real sounding length, so a hit plays only the sound (not the long
// silent tail), which keeps the audio thread from mixing seconds of silence
// per overlapping hit on low-end devices.
const _prerenderBuffers = new Map();
const _prerenderPending = new Set();

// Instruments that synthesize live on every hit instead of using a cached
// buffer, because their realism depends on per-hit randomization that a single
// pre-rendered buffer cannot express. Keep these short and cheap so the
// per-hit cost stays negligible.
const LIVE_ONLY = new Set(['clap']);

/**
 * Finds the sounding length of a rendered buffer by scanning back from the end
 * for the last sample above a small threshold, then adds a short release tail.
 * Clamped to the buffer duration with a small minimum.
 */
function soundingDuration(buffer, sampleRate) {
    const data = buffer.getChannelData(0);
    const threshold = 1e-4;
    let last = -1;
    for (let i = data.length - 1; i >= 0; i--) {
        if (Math.abs(data[i]) > threshold) { last = i; break; }
    }
    if (last < 0) return Math.min(buffer.duration, 0.05);
    const seconds = (last + 1) / sampleRate + 0.04;
    return Math.max(0.05, Math.min(buffer.duration, seconds));
}

function variantKeyFor(key, channelName) {
    return channelName && channelName.startsWith('A') ? `${key}:A` : key;
}

function prerenderVariant(state, key, variant, channelName) {
    try {
        const sampleRate = state.audioCtx.sampleRate;
        const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * PRERENDER_SECONDS), sampleRate);
        const fn = instruments[key];
        if (!fn) throw new Error(`Unknown instrument: ${key}`);
        fn({ audioCtx: offline }, 0, 1, channelName || '');
        offline.startRendering().then(buffer => {
            _prerenderBuffers.set(variant, {
                buffer,
                duration: soundingDuration(buffer, sampleRate)
            });
        }).catch(() => {
            _prerenderBuffers.set(variant, null);
        });
    } catch (err) {
        _prerenderBuffers.set(variant, null);
    }
}

// Per-hit output-gain pool. The prerendered path creates one GainNode per hit;
// at dense meters that is a steady allocation stream (≈14/s) whose GC can
// surface as main-thread jitter on low-end devices. Unlike oscillators and
// buffer sources, a GainNode has no one-shot start/enabled state, so once its
// hit has ended and it is disconnected it can be reused — reset its automation
// and hand it back. The source stays one-shot and is created per hit.
const GAIN_POOL_MAX = 64;
const _gainPool = [];

function acquirePooledGain(ctx) {
    const gain = _gainPool.pop();
    if (gain) return gain;
    return ctx.createGain();
}

function releasePooledGain(gain) {
    // Clear any automation left by the finished hit before the node idles in
    // the pool, and only retain up to a bounded number of spare nodes.
    try { gain.gain.cancelScheduledValues(0); } catch (err) { /* older engines */ }
    if (_gainPool.length < GAIN_POOL_MAX) _gainPool.push(gain);
}

/**
 * Triggers one instrument hit. Uses the pre-rendered buffer for this
 * instrument + channel variant when it is available (BufferSource + gain),
 * falling back to live synthesis until the offline render resolves — so the
 * first hit for a new instrument sounds exactly as before.
 */
export function triggerInstrument(state, key, now, vol, channelName) {
    const variant = variantKeyFor(key, channelName);
    // Live-only instruments use per-hit randomness (e.g. the clap's flam jitter)
    // that cannot be captured by a single pre-rendered buffer, so they always
    // synthesize live. They are deliberately short/cheap.
    if (LIVE_ONLY.has(key)) {
        const fn = instruments[key];
        if (fn) fn(state, now, vol, channelName || '');
        return;
    }
    let entry = _prerenderBuffers.get(variant);
    if (entry === undefined) {
        if (!_prerenderPending.has(variant)) {
            _prerenderPending.add(variant);
            prerenderVariant(state, key, variant, channelName);
        }
        entry = null;
    }
    if (!entry) {
        const fn = instruments[key];
        if (fn) fn(state, now, vol, channelName || '');
        return;
    }

    const ctx = state.audioCtx;
    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    const gain = acquirePooledGain(ctx);
    gain.gain.setValueAtTime(vol, now);
    source.connect(gain);
    gain.connect(ctx.destination);
    // Play only the sounding span, not the whole (mostly silent) prerender.
    source.start(now, 0, entry.duration);
    source.onended = () => {
        source.disconnect();
        gain.disconnect();
        releasePooledGain(gain);
    };
}

/** Dispatch table mapping instrument value keys to their synthesis functions. */
export const instruments = {
    kick: playKick,
    snare: playSnare,
    cl_hihat: playClosedHiHat,
    op_hihat: playOpenHiHat,
    palitos: playPalitos,
    shaker: playShaker,
    tom: playTom,
    clap: playClap,
    agogo: playAgogo,
    ping: playPing,
    rimshot: playRimshot,
    woodblock: playWoodblock,
    cowbell: playCowbell,
    cowbell_boca: playCowbellBoca,
    cowbell_centro: playCowbellCentro,
    tambourine: playTambourine,
    conga_low: playCongaLow,
    conga_middle: playCongaMiddle,
    conga_high: playCongaHigh,
    conga_low_bass: playCongaLowBass,
    conga_middle_bass: playCongaMiddleBass,
    conga_high_bass: playCongaHighBass,
    conga_low_press: playCongaLowPress,
    conga_middle_press: playCongaMiddlePress,
    conga_high_press: playCongaHighPress,
    bongo_low: playBongoLow,
    bongo_high: playBongoHigh,
    bongo_low_mute: playBongoLowMute,
    bongo_high_slap: playBongoHighSlap,
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
    ewe_kaganu: playEweKaganu,
    ewe_kidi: playEweKidi,
    ewe_kidi_press: playEweKidiPress,
    ewe_sogo: playEweSogo,
    ewe_sogo_press: playEweSogoPress,
    ewe_atsimevu: playEweAtsimevu,
    ewe_atsimevu_stick: playEweAtsimevuStick,
    axatse_pa: playAxatsePa,
    axatse_ti: playAxatseTi,
    foot_tap: playFootTap,
    gankogui_low: playGankoguiLow,
    gankogui_high: playGankoguiHigh,
    guiro: playGuiro,
    conga_slap: playCongaSlap,
    conga_low_slap: playCongaLowSlap,
    conga_middle_slap: playCongaMiddleSlap,
    conga_high_slap: playCongaHighSlap,
    slap: playSlap,
    talking_drum: playTalkingDrum,
    temple_block: playTempleBlock,
    triangle: playTriangle,
    udu: playUdu,
    bata_low: playBataLow,
    bata_middle: playBataMiddle,
    bata_high: playBataHigh,
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
