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

/**
 * Available percussion instruments, sorted alphabetically by display label.
 * Each entry maps a short value key (used in serialization) to a human-readable label.
 */
export const instrumentCatalog = [
    { value: 'agogo', label: 'Agogo Bell Accent' },
    { value: 'cowbell', label: 'Analog Cowbell' },
    { value: 'bata_low', label: 'Batá Drum (Low)' },
    { value: 'bata_high', label: 'Batá Drum (High)' },
    { value: 'kick', label: 'Bass Drum (Kick)' },
    { value: 'bongo_high', label: 'Bongo (High)' },
    { value: 'bongo_low', label: 'Bongo (Low)' },
    { value: 'castanets', label: 'Castanets' },
    { value: 'claves', label: 'Claves' },
    { value: 'cl_hihat', label: 'Closed Hi-Hat' },
    { value: 'conga_high', label: 'Conga (High)' },
    { value: 'conga_low', label: 'Conga (Low)' },
    { value: 'conga_slap', label: 'Conga Slap' },
    { value: 'cajon_bass', label: 'Cajón Bass' },
    { value: 'cajon_slap', label: 'Cajón Slap' },
    { value: 'crash', label: 'Crash Cymbal' },
    { value: 'ping', label: 'Crystal High Ping' },
    { value: 'synth_kick', label: 'EDM Synth Kick' },
    { value: 'electronic_snare', label: 'Electronic Snare' },
    { value: 'foot_tap', label: 'Foot Tap' },
    { value: 'djembe', label: 'Frame Drum / Djembe' },
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
    { value: 'timbale', label: 'Timbale' },
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
            muted: true,
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
        prefix
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
 * Toggles audio on/off. Creates the AudioContext on first user gesture
 * (required by browser autoplay policies) and resumes it if suspended.
 */
export async function toggleAudio(state, ui) {
    try {
        if (!state.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioContextClass();
        }
        if (state.audioCtx.state === 'suspended') {
            await state.audioCtx.resume();
        }
        state.audioEnabled = !state.audioEnabled;
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
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol * 0.5, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

/** Tom: sine oscillator with pitch sweep, frequency varies by channel (A vs B). */
function playTom(state, now, vol, channelName) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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

    const gain = state.audioCtx.createGain();
    filter.connect(gain);
    gain.connect(state.audioCtx.destination);

    [0, 0.012, 0.024].forEach((delay) => {
        const burst = getNoiseSource(state);
        if (!burst) return;
        const burstGain = state.audioCtx.createGain();
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
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 880 : 587, now);
    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.18);
}

/** Crystal ping: high-frequency sine tone, pitch varies by channel. */
function playPing(state, now, vol, channelName) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 1400 : 950, now);
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.3);
}

/** Rimshot: short triangle oscillator click at 680 Hz. */
function playRimshot(state, now, vol) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.05);
}

/** Woodblock: sine oscillator with a brief downward pitch sweep. */
function playWoodblock(state, now, vol) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const osc1 = state.audioCtx.createOscillator();
    const osc2 = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
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

    const masterGain = state.audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
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

/** Conga high (Quinto): bright open tone with sharper pitch drop and shorter decay. */
function playCongaHigh(state, now, vol, channelName) {
    const baseFreq = channelName.startsWith('A') ? 220 : 200;
    const decay = 0.14;
    const overtones = [1.6, 2.4];

    const masterGain = state.audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
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

    const masterGain = state.audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + slapDecay);
    masterGain.connect(state.audioCtx.destination);

    // Sharp resonant oscillator ring for rim edge
    createCongaTone(state, slapFreq, 0.4, 'triangle', masterGain, now, slapDecay, 2.0);

    // High-frequency skin snap transient
    createCongaSlapNoise(state, masterGain, now, slapDecay);
}

/** Helper: synthesizes a tonal component with precise pitch drops for congas. */
function createCongaTone(state, freq, volume, waveType, target, startTime, duration, pitchBendFactor) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    noise.start(startTime);
}

/** Bongo low: short sine sweep, frequency varies by channel. */
function playBongoLow(state, now, vol, channelName) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(6200, now);
    oscGain.gain.setValueAtTime(vol * 0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.4);
}

/** Claves: two slightly detuned sines creating a 5 Hz beat frequency for wooden click. */
function playClaves(state, now, vol) {
    const osc1 = state.audioCtx.createOscillator();
    const osc2 = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const osc1 = state.audioCtx.createOscillator();
    const osc2 = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3500, now);
    oscGain.gain.setValueAtTime(vol * 0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.04);
}

/** EDM synth kick: sub-bass sine + noise transient + mid-range click. */
function playSynthKick(state, now, vol) {
    const subOsc = state.audioCtx.createOscillator();
    const subGain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const midOsc = state.audioCtx.createOscillator();
    const midGain = state.audioCtx.createGain();
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
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
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
    const gain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    oscGain.gain.setValueAtTime(vol * 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.05);
}

/** Batá low (Iyá bass head): deep bass with additive overtones, pitch envelope, and warm decay. */
function playBataLow(state, now, vol) {
    const fundamental = 60;
    const overtones = [1.4, 2.0, 2.5];
    const decay = 0.35;
    const slapMix = 0.2;

    const masterGain = state.audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    // Fundamental
    createBataTone(state, fundamental, 0.6, masterGain, now, decay);

    // Overtone partials (higher overtones decay slower for more sustain)
    overtones.forEach((ratio, index) => {
        const partialDecay = decay * (1 - (index * 0.08));
        createBataTone(state, fundamental * ratio, 0.35 / (index + 1), masterGain, now, partialDecay);
    });

    // Transient slap component
    if (slapMix > 0) {
        createBataSlap(state, slapMix, masterGain, now, decay * 0.3);
    }
}

/** Batá high (Enú head): higher pitch, sharper attack, shorter decay with additive overtones. */
function playBataHigh(state, now, vol) {
    const fundamental = 160;
    const overtones = [1.6, 2.3, 3.1];
    const decay = 0.25;
    const slapMix = 0.4;

    const masterGain = state.audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
    masterGain.connect(state.audioCtx.destination);

    // Fundamental
    createBataTone(state, fundamental, 0.6, masterGain, now, decay);

    // Overtone partials
    overtones.forEach((ratio, index) => {
        const partialDecay = decay * (1 - (index * 0.08));
        createBataTone(state, fundamental * ratio, 0.35 / (index + 1), masterGain, now, partialDecay);
    });

    // Transient slap component
    if (slapMix > 0) {
        createBataSlap(state, slapMix, masterGain, now, decay * 0.3);
    }
}

/** Helper: creates an individual frequency component for Batá drums. */
function createBataTone(state, freq, volume, targetNode, startTime, duration) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(volume, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(targetNode);
    noise.start(startTime);
}

/** Cajón bass: low-frequency thump from center slap, short decay. */
function playCajonBass(state, now, vol) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.15);

    // Box body resonance
    const osc2 = state.audioCtx.createOscillator();
    const osc2Gain = state.audioCtx.createGain();
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
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    // Mid-frequency slap tone
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.03);
    oscGain.gain.setValueAtTime(vol * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.05);
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
    conga_high: playCongaHigh,
    bongo_low: playBongoLow,
    bongo_high: playBongoHigh,
    maraca: playMaraca,
    crash: playCrash,
    ride: playRide,
    claves: playClaves,
    djembe: playDjembe,
    timbale: playTimbale,
    castanets: playCastanets,
    synth_kick: playSynthKick,
    electronic_snare: playElectronicSnare,
    foot_tap: playFootTap,
    conga_slap: playCongaSlap,
    slap: playSlap,
    bata_low: playBataLow,
    bata_high: playBataHigh,
    cajon_bass: playCajonBass,
    cajon_slap: playCajonSlap
};

/**
 * Plays the sound for a given channel. Applies the channel's volume,
 * mute state, gain scale, and the global volume multiplier.
 * For multi-voice channels (master, A, B), plays all active voices.
 */
export function playChannelSound(state, channels, channelName, globalVolume = 1, voiceIndex = null) {
    if (!state.audioEnabled || !state.audioCtx) return;

    // Multi-voice channels: play specific voice or all voices
    if (channelName === 'master') {
        const voices = channels.masterVoices || [];
        if (voiceIndex !== null) {
            // Play only the specified voice
            if (voices[voiceIndex]) playSingleChannel(state, voices[voiceIndex], globalVolume);
        } else {
            voices.forEach(channel => {
                playSingleChannel(state, channel, globalVolume);
            });
        }
    } else if (channelName === 'A') {
        const voices = channels.Avoices || [];
        if (voiceIndex !== null) {
            if (voices[voiceIndex]) playSingleChannel(state, voices[voiceIndex], globalVolume);
        } else {
            voices.forEach(channel => {
                playSingleChannel(state, channel, globalVolume);
            });
        }
    } else if (channelName === 'B') {
        const voices = channels.Bvoices || [];
        if (voiceIndex !== null) {
            if (voices[voiceIndex]) playSingleChannel(state, voices[voiceIndex], globalVolume);
        } else {
            voices.forEach(channel => {
                playSingleChannel(state, channel, globalVolume);
            });
        }
    } else {
        // Fixed single-voice channels
        const channel = channels[channelName];
        if (channel) playSingleChannel(state, channel, globalVolume);
    }
}

/** Plays a sound for a single channel if not muted. */
function playSingleChannel(state, channel, globalVolume) {
    if (!channel || channel.muted) return;
    if (!channel.sound) return;

    const vol = channel.volume * channel.gainScale * globalVolume;
    if (vol <= 0) return;

    const fn = instruments[channel.sound];
    if (!fn) return;

    fn(state, state.audioCtx.currentTime, vol, channel.prefix || '');
}
