export const instrumentCatalog = [
    { value: 'agogo', label: 'Agogo Bell Accent' },
    { value: 'cowbell', label: 'Analog Cowbell' },
    { value: 'kick', label: 'Bass Drum (Kick)' },
    { value: 'bongo_high', label: 'Bongo (High)' },
    { value: 'bongo_low', label: 'Bongo (Low)' },
    { value: 'castanets', label: 'Castanets' },
    { value: 'claves', label: 'Claves' },
    { value: 'cl_hihat', label: 'Closed Hi-Hat' },
    { value: 'conga_high', label: 'Conga (High)' },
    { value: 'conga_low', label: 'Conga (Low)' },
    { value: 'conga_slap', label: 'Conga Slap' },
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

export function createChannels() {
    return {
        driver: {
            soundEl: document.getElementById('soundDriver'),
            volEl: document.getElementById('volDriver'),
            muteEl: document.getElementById('muteDriver'),
            volume: 0.6,
            muted: false,
            gainScale: 0.6
        },
        custom: {
            soundEl: document.getElementById('soundCustom'),
            volEl: document.getElementById('volCustom'),
            muteEl: document.getElementById('muteCustom'),
            volume: 0.7,
            muted: false,
            gainScale: 0.6
        },
        A: {
            soundEl: document.getElementById('soundA'),
            volEl: document.getElementById('volA'),
            muteEl: document.getElementById('muteA'),
            volume: 0.5,
            muted: false,
            gainScale: 0.5
        },
        Awheel: {
            soundEl: document.getElementById('soundAWheel'),
            volEl: document.getElementById('volAWheel'),
            muteEl: document.getElementById('muteAWheel'),
            volume: 0.45,
            muted: false,
            gainScale: 0.5
        },
        B: {
            soundEl: document.getElementById('soundB'),
            volEl: document.getElementById('volB'),
            muteEl: document.getElementById('muteB'),
            volume: 0.4,
            muted: false,
            gainScale: 0.4
        },
        Bwheel: {
            soundEl: document.getElementById('soundBWheel'),
            volEl: document.getElementById('volBWheel'),
            muteEl: document.getElementById('muteBWheel'),
            volume: 0.35,
            muted: false,
            gainScale: 0.4
        }
    };
}

export function populateMenus(channels) {
    const defaults = {
        driver: 'kick',
        custom: 'rimshot',
        A: 'woodblock',
        Awheel: 'shaker',
        B: 'cowbell',
        Bwheel: 'shaker'
    };

    Object.entries(channels).forEach(([name, channel]) => {
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

export function wireChannels(channels) {
    Object.values(channels).forEach(channel => {
        channel.volEl.addEventListener('input', () => {
            channel.volume = parseFloat(channel.volEl.value);
        });

        channel.muteEl.addEventListener('click', () => {
            channel.muted = !channel.muted;
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        });
    });
}

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

function generateNoiseBuffer(state, duration) {
    if (!state.audioCtx) return null;

    const bufferSize = Math.floor(state.audioCtx.sampleRate * duration);
    const buffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = state.audioCtx.createBufferSource();
    source.buffer = buffer;
    return source;
}

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

function playSnare(state, now, vol) {
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    oscGain.gain.setValueAtTime(vol * 0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.08);

    const noise = generateNoiseBuffer(state, 0.15);
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

function playClosedHiHat(state, now, vol) {
    const noise = generateNoiseBuffer(state, 0.04);
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

function playOpenHiHat(state, now, vol) {
    const noise = generateNoiseBuffer(state, 0.28);
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

function playShaker(state, now, vol) {
    const noise = generateNoiseBuffer(state, 0.07);
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

function playClap(state, now, vol) {
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1300, now);

    const gain = state.audioCtx.createGain();
    filter.connect(gain);
    gain.connect(state.audioCtx.destination);

    [0, 0.012, 0.024].forEach((delay) => {
        const burst = generateNoiseBuffer(state, 0.02);
        if (!burst) return;
        const burstGain = state.audioCtx.createGain();
        burstGain.gain.setValueAtTime(vol * 0.45, now + delay);
        burstGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);
        burst.connect(filter);
        filter.connect(burstGain);
        burstGain.connect(state.audioCtx.destination);
        burst.start(now + delay);
    });

    const mainClap = generateNoiseBuffer(state, 0.16);
    if (!mainClap) return;
    gain.gain.setValueAtTime(vol * 0.65, now + 0.038);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    mainClap.connect(filter);
    mainClap.start(now + 0.038);
}

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

// ===== New Percussion Instruments =====

function playTambourine(state, now, vol) {
    // Bandpass noise for jingle + sine ring for body
    const noise = generateNoiseBuffer(state, 0.2);
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

function playCongaLow(state, now, vol, channelName) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 240 : 200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(vol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.18);
}

function playCongaHigh(state, now, vol, channelName) {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(channelName.startsWith('A') ? 340 : 300, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain.gain.setValueAtTime(vol * 0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain); gain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.14);
}

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

function playMaraca(state, now, vol) {
    // Noise with amplitude modulation to simulate shaking
    const noise = generateNoiseBuffer(state, 0.15);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7000, now);
    filter.Q.setValueAtTime(2, now);
    const gain = state.audioCtx.createGain();
    // AM envelope: rapid pulses simulate shaking
    gain.gain.setValueAtTime(0.001, now);
    for (let i = 0; i < 12; i++) {
        const t = now + i * 0.012;
        gain.gain.linearRampToValueAtTime(vol * 0.4, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.006);
    }
    noise.connect(filter); filter.connect(gain); gain.connect(state.audioCtx.destination);
    noise.start(now);
}

function playCrash(state, now, vol) {
    // Full noise with highpass + sustained sine for wash
    const noise = generateNoiseBuffer(state, 1.0);
    if (!noise) return;
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, now);
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    // Subtle metallic resonance
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(5200, now);
    oscGain.gain.setValueAtTime(vol * 0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.6);
}

function playRide(state, now, vol) {
    // Bandpass noise for ping + sustained sine for wash
    const noise = generateNoiseBuffer(state, 0.6);
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

    // Metallic bell tone
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(6200, now);
    oscGain.gain.setValueAtTime(vol * 0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.4);
}

function playClaves(state, now, vol) {
    // Two sine oscillators with slight beat frequency for wooden click
    const osc1 = state.audioCtx.createOscillator();
    const osc2 = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(2000, now);
    osc2.frequency.setValueAtTime(2005, now); // 5Hz beat
    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain); osc2.connect(gain); gain.connect(state.audioCtx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + 0.08); osc2.stop(now + 0.08);
}

function playDjembe(state, now, vol, channelName) {
    // Sine + triangle mix with deep sweep for body
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

function playTimbale(state, now, vol, channelName) {
    // Sine with fast attack + pitch envelope + noise transient
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

    // Noise transient attack
    const noise = generateNoiseBuffer(state, 0.03);
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

function playCastanets(state, now, vol) {
    // Short noise burst + resonant peak
    const noise = generateNoiseBuffer(state, 0.04);
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

    // Resonant wood tone
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3500, now);
    oscGain.gain.setValueAtTime(vol * 0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.04);
}

function playSynthKick(state, now, vol) {
    // Sub-bass sine + noise transient + distortion for EDM kick
    const subOsc = state.audioCtx.createOscillator();
    const subGain = state.audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    subGain.gain.setValueAtTime(vol * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    subOsc.connect(subGain); subGain.connect(state.audioCtx.destination);
    subOsc.start(now); subOsc.stop(now + 0.25);

    // Transient click with distortion
    const noise = generateNoiseBuffer(state, 0.05);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    // Mid-range click
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

function playElectronicSnare(state, now, vol) {
    // Noise + distorted sine + formant filter
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    oscGain.gain.setValueAtTime(vol * 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.1);

    // Noise through formant bandpass
    const noise = generateNoiseBuffer(state, 0.2);
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

function playCongaSlap(state, now, vol, channelName) {
     // Conga slap technique: sharp finger strike noise + resonant body with pitch rise
    const baseFreq = channelName.startsWith('A') ? 300 : 260;

    // Sharp broadband transient for finger strike on skin
    const noise = generateNoiseBuffer(state, 0.05);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(4000, now);
    noiseFilter.Q.setValueAtTime(1.5, now);
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    // Fundamental: slap technique produces a pitch rise (skin tension increases on impact)
    const osc = state.audioCtx.createOscillator();
    const oscGain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.8, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.02);
    oscGain.gain.setValueAtTime(vol * 0.75, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(oscGain); oscGain.connect(state.audioCtx.destination);
    osc.start(now); osc.stop(now + 0.14);

    // Second harmonic for skin-like brightness
    const osc2 = state.audioCtx.createOscillator();
    const osc2Gain = state.audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 1.76, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, now + 0.025);
    osc2Gain.gain.setValueAtTime(vol * 0.2, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(osc2Gain); osc2Gain.connect(state.audioCtx.destination);
    osc2.start(now); osc2.stop(now + 0.1);

    // High-frequency pop layer for the finger release "click"
    const popNoise = generateNoiseBuffer(state, 0.02);
    if (!popNoise) return;
    const popFilter = state.audioCtx.createBiquadFilter();
    popFilter.type = 'bandpass';
    popFilter.frequency.setValueAtTime(8000, now + 0.025);
    popFilter.Q.setValueAtTime(3, now);
    const popGain = state.audioCtx.createGain();
    popGain.gain.setValueAtTime(0.001, now + 0.025);
    popGain.gain.linearRampToValueAtTime(vol * 0.3, now + 0.028);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    popNoise.connect(popFilter); popFilter.connect(popGain); popGain.connect(state.audioCtx.destination);
    popNoise.start(now + 0.025);
}

function playFootTap(state, now, vol) {
    // Very short filtered noise click
    const noise = generateNoiseBuffer(state, 0.025);
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

function playSlap(state, now, vol) {
    // Noise burst + medium sine resonance for hand slap
    const noise = generateNoiseBuffer(state, 0.06);
    if (!noise) return;
    const noiseFilter = state.audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = state.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(state.audioCtx.destination);
    noise.start(now);

    // Mid resonance
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

const instruments = {
    kick: (state, now, vol, channel) => playKick(state, now, vol, channel),
    snare: (state, now, vol, channel) => playSnare(state, now, vol, channel),
    cl_hihat: (state, now, vol, channel) => playClosedHiHat(state, now, vol, channel),
    op_hihat: (state, now, vol, channel) => playOpenHiHat(state, now, vol, channel),
    shaker: (state, now, vol, channel) => playShaker(state, now, vol, channel),
    tom: (state, now, vol, channel) => playTom(state, now, vol, channel),
    clap: (state, now, vol, channel) => playClap(state, now, vol, channel),
    agogo: (state, now, vol, channel) => playAgogo(state, now, vol, channel),
    ping: (state, now, vol, channel) => playPing(state, now, vol, channel),
    rimshot: (state, now, vol, channel) => playRimshot(state, now, vol, channel),
    woodblock: (state, now, vol, channel) => playWoodblock(state, now, vol, channel),
    cowbell: (state, now, vol, channel) => playCowbell(state, now, vol, channel),
    // New instruments
    tambourine: (state, now, vol, channel) => playTambourine(state, now, vol, channel),
    conga_low: (state, now, vol, channel) => playCongaLow(state, now, vol, channel),
    conga_high: (state, now, vol, channel) => playCongaHigh(state, now, vol, channel),
    bongo_low: (state, now, vol, channel) => playBongoLow(state, now, vol, channel),
    bongo_high: (state, now, vol, channel) => playBongoHigh(state, now, vol, channel),
    maraca: (state, now, vol, channel) => playMaraca(state, now, vol, channel),
    crash: (state, now, vol, channel) => playCrash(state, now, vol, channel),
    ride: (state, now, vol, channel) => playRide(state, now, vol, channel),
    claves: (state, now, vol, channel) => playClaves(state, now, vol, channel),
    djembe: (state, now, vol, channel) => playDjembe(state, now, vol, channel),
    timbale: (state, now, vol, channel) => playTimbale(state, now, vol, channel),
    castanets: (state, now, vol, channel) => playCastanets(state, now, vol, channel),
    synth_kick: (state, now, vol, channel) => playSynthKick(state, now, vol, channel),
    electronic_snare: (state, now, vol, channel) => playElectronicSnare(state, now, vol, channel),
    foot_tap: (state, now, vol, channel) => playFootTap(state, now, vol, channel),
    conga_slap: (state, now, vol, channel) => playCongaSlap(state, now, vol, channel),
    slap: (state, now, vol, channel) => playSlap(state, now, vol, channel)
};

export function playChannelSound(state, channels, channelName, globalVolume = 1) {
    if (!state.audioEnabled || !state.audioCtx) return;

    const channel = channels[channelName];
    if (!channel || channel.muted) return;

    const vol = channel.volume * channel.gainScale * globalVolume;
    if (vol <= 0) return;

    const sound = channel.soundEl.value;
    const fn = instruments[sound];
    if (!fn) return;

    fn(state, state.audioCtx.currentTime, vol, channelName);
}