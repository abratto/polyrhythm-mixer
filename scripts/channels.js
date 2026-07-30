/**
 * channels.js — Audio channel creation, DOM wiring, mixer controls, and solo detection.
 *
 *   createChannels / addVoiceChannel  — channel object and voice factory
 *   populateMenus / populateInstrumentSelect — fill <select> elements from catalog
 *   bindSoloMute / wireChannels       — DOM event wiring for faders and buttons
 *   refreshSilenced / isAnyChannelSoloed — recompute mute/solo state across all channels
 */

import { instrumentCatalog } from './instruments.js';

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
            soloEl: document.getElementById('soloDriver'),
            sound: 'kick',
            volume: 0.6,
            muted: false,
            soloed: false,
            silenced: false,
            gainScale: 0.6
        },
        Awheel: {
            soundEl: document.getElementById('soundAWheel'),
            volEl: document.getElementById('volAWheel'),
            muteEl: document.getElementById('muteAWheel'),
            soloEl: document.getElementById('soloAWheel'),
            sound: 'shaker',
            volume: 0.45,
            muted: false,
            soloed: false,
            silenced: false,
            gainScale: 0.5
        },
        Bwheel: {
            soundEl: document.getElementById('soundBWheel'),
            volEl: document.getElementById('volBWheel'),
            muteEl: document.getElementById('muteBWheel'),
            soloEl: document.getElementById('soloBWheel'),
            sound: 'shaker',
            volume: 0.35,
            muted: false,
            soloed: false,
            silenced: false,
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
    const soloEl = document.getElementById(`solo_${id}`);

    const channel = {
        soundEl,
        volEl,
        muteEl,
        soloEl,
        sound: defaults[prefix] || 'kick', // cached instrument value
        volume: 0.5,
        muted: false,
        soloed: false,
        silenced: false,
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

        // Volume is owned by the mixer strip; Solo/Mute are mounted inside the
        // lane voice rows and bound there via bindSoloMute.
        if (channel.volEl) {
            channel.volEl.addEventListener('input', () => {
                channel.volume = parseFloat(channel.volEl.value);
            });
        }

        return channel;
    } catch (err) {
        console.error(`addVoiceChannel failed for ${prefix}_${voiceIndex}:`, err);
        return null;
    }
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

/** Fills a <select> with the instrument catalog, selecting `selectedValue`. */
export function populateInstrumentSelect(el, selectedValue) {
    if (!el) return;
    el.innerHTML = '';
    instrumentCatalog.forEach(inst => {
        const opt = document.createElement('option');
        opt.value = inst.value;
        opt.textContent = inst.label;
        if (inst.value === selectedValue) opt.selected = true;
        el.appendChild(opt);
    });
}

/**
 * Wires (or re-wires) a channel's Solo/Mute buttons. Null-safe: if the buttons
 * aren't present yet (e.g. before the lane mounts them), this is a no-op and can
 * be called again once the elements exist. Using assignment (not addEventListener)
 * keeps it idempotent across re-binds.
 */
export function bindSoloMute(channel, channels) {
    if (!channel) return;
    if (channel.muteEl) {
        channel.muteEl.classList.toggle('muted', channel.muted);
        channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        channel.muteEl.onclick = () => {
            channel.muted = !channel.muted;
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
            refreshSilenced(channels);
        };
    }
    if (channel.soloEl) {
        channel.soloEl.classList.toggle('soloed', channel.soloed);
        channel.soloEl.textContent = channel.soloed ? 'Soloed' : 'Solo';
        channel.soloEl.onclick = () => {
            channel.soloed = !channel.soloed;
            channel.soloEl.classList.toggle('soloed', channel.soloed);
            channel.soloEl.textContent = channel.soloed ? 'Soloed' : 'Solo';
            refreshSilenced(channels);
        };
    }
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

        // Cache instrument changes (soundEl is created inline in the lane,
        // so it may not exist yet when wireChannels runs at startup)
        if (channel.soundEl) {
            channel.soundEl.addEventListener('change', () => {
                channel.sound = channel.soundEl.value;
            });
        }

        // Solo/Mute are mounted inside the lanes; bind them once they exist.
        bindSoloMute(channel, channels);
    });
}

/**
 * Recomputes each channel's effective `silenced` flag (muted, or another
 * channel is soloed) and notifies the UI so lanes can dim/suppress. Called
 * from every mute/solo toggle and from bulk state restores (share/reset).
 */
export function refreshSilenced(channels) {
    const anySolo = isAnyChannelSoloed(channels);
    const all = [
        channels.driver,
        channels.Awheel,
        channels.Bwheel,
        ...(channels.masterVoices || []),
        ...(channels.Avoices || []),
        ...(channels.Bvoices || [])
    ];
    for (const c of all) {
        if (!c) continue;
        c.silenced = !!(c.muted || (anySolo && !c.soloed));
    }
    if (typeof channels.onMixChange === 'function') channels.onMixChange();
}

/** Returns true if any channel in the mixer has solo enabled. */
export function isAnyChannelSoloed(channels) {
    for (const key of ['driver', 'Awheel', 'Bwheel']) {
        if (channels[key]?.soloed) return true;
    }
    for (const key of ['masterVoices', 'Avoices', 'Bvoices']) {
        if ((channels[key] || []).some(ch => ch?.soloed)) return true;
    }
    return false;
}
