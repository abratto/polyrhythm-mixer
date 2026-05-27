export const instrumentCatalog = [
    { value: 'kick', label: 'Bass Drum (Kick)' },
    { value: 'snare', label: 'Snare Drum' },
    { value: 'rimshot', label: 'Rimshot Click' },
    { value: 'clap', label: 'Handclap' },
    { value: 'cl_hihat', label: 'Closed Hi-Hat' },
    { value: 'op_hihat', label: 'Open Hi-Hat' },
    { value: 'shaker', label: 'Percussion Shaker' },
    { value: 'tom', label: 'Synth Electronic Tom' },
    { value: 'woodblock', label: 'Woodblock Clack' },
    { value: 'cowbell', label: 'Analog Cowbell' },
    { value: 'agogo', label: 'Agogo Bell Accent' },
    { value: 'ping', label: 'Crystal High Ping' }
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
        Awheel: 'agogo',
        B: 'cowbell',
        Bwheel: 'ping'
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
    cowbell: (state, now, vol, channel) => playCowbell(state, now, vol, channel)
};

export function playChannelSound(state, channels, channelName) {
    if (!state.audioEnabled || !state.audioCtx) return;

    const channel = channels[channelName];
    if (!channel || channel.muted) return;

    const vol = channel.volume * channel.gainScale;
    if (vol <= 0) return;

    const sound = channel.soundEl.value;
    const fn = instruments[sound];
    if (!fn) return;

    fn(state, state.audioCtx.currentTime, vol, channelName);
}
