/**
 * app.js — Application entry point and initialization.
 *
 * Bootstraps the polyrhythm mixer by:
 *   1. Collecting DOM references
 *   2. Creating state, lanes, and audio channels
 *   3. Initializing voice channels for multi-voice lanes
 *   4. Wiring all UI controls to their handlers
 *   5. Attempting to load shared state from the URL
 *   6. Starting the canvas animation loop
 *
 * The initialization order is critical: state must be derived before
 * lanes are built, and controls must be wired before the animation
 * starts reading state values.
 */
import { getDomRefs } from './dom.js';
import { createState, resetFlashState, updateDerivedState, updatePhaseUI } from './state.js';
import { createLanes, resetPatterns, resizeAllLanes, buildAllLanes, buildLane, wireLaneClearButtons, wireLaneInfoButtons, markCurrentButtons, addVoice, updateVoiceInstrumentLabels } from './lanes.js';
import { createChannels, populateMenus, wireChannels, toggleAudio, addVoiceChannel, syncAudioStartTime, startAudioScheduler, stopAudioScheduler, resetAudioScheduler, updateWorkerScheduler } from './audio.js';
import { wireControls, shouldAutoOpenHelpModal, openHelpModal, closeHelpModal } from './controls.js';
import { copyShareLink, loadStateFromUrl } from './share.js';
import { closeSaveRhythmModal, closeSavedRhythmsModal, openSaveRhythmModal, openSavedRhythmsModal, saveCurrentRhythm } from './saved-rhythms.js';
import { startAnimation } from './render.js';

const STARTING_MIXER_STATE = {
    A: 6,
    B: 4,
    phraseCyclesA: 2,
    phraseCyclesB: 2,
    masterPhraseCycles: 1,
    tempo: 90,
    masterVolume: 80,
    fixedChannels: {
        driver: { sound: 'shaker', volume: 0.6, muted: false },
        Awheel: { sound: 'shaker', volume: 0.45, muted: false },
        Bwheel: { sound: 'shaker', volume: 0.35, muted: false }
    }
};

// Phase 1: Collect all DOM element references
const { canvas, ctx, ui } = getDomRefs();

// Phase 2: Create core data structures
const state = createState(ui);
const lanes = createLanes(ui, state);
const channels = createChannels();

const MIXER_LABELS = {
    master: 'Master Cycle',
    A: 'Meter A Phrase',
    B: 'Meter B Phrase'
};

/**
 * Creates the initial voice channel DOM strips for a multi-voice group.
 */
function createVoiceStripDOM(container, prefix, voiceIndex, color, label) {
    const id = `${prefix}_${voiceIndex}`;
    const strip = document.createElement('div');
    strip.className = `mixer-strip voice-${prefix.toLowerCase()}`;
    strip.id = `strip_${id}`;

    strip.innerHTML = `
        <div class="strip-header" style="color: ${color};">${label} Voice ${voiceIndex + 1}</div>
        <select id="sound_${id}" style="padding: 4px; width: 100%; font-size:12px;"></select>
        <div class="fader-area">
            <button id="mute_${id}" class="mute-btn">Mute</button>
        </div>
        <div class="fader-area volume-only-area">
            <input type="range" id="vol_${id}" class="volume-fader" min="0" max="1" step="0.05" value="0.5">
        </div>
    `;

    container.appendChild(strip);
}

function laneForPrefix(prefix) {
    if (prefix === 'master') return lanes.master;
    if (prefix === 'A') return lanes.Aphrase;
    return lanes.Bphrase;
}

function voiceChannelKeyForPrefix(prefix) {
    if (prefix === 'master') return 'masterVoices';
    if (prefix === 'A') return 'Avoices';
    return 'Bvoices';
}

function bindChannelToVoice(prefix, voiceIndex, channel) {
    const lane = laneForPrefix(prefix);
    if (!lane.voices[voiceIndex] || !channel) return null;

    lane.voices[voiceIndex].channel = channel;
    channel.onInstrumentChange = () => updateVoiceInstrumentLabels(lane);
    return channel;
}

/**
 * Rebuilds voice mixer strips to match the current voice count.
 * Used after loading a share URL with multiple voices.
 */
function rebuildVoiceMixerStrips(prefix, container, color, label) {
    const lane = laneForPrefix(prefix);
    const key = voiceChannelKeyForPrefix(prefix);
    container.innerHTML = '';
    channels[key] = [];
    lane.voices.forEach((voice, idx) => {
        createVoiceStripDOM(container, prefix, idx, color, label);
        const channel = bindChannelToVoice(prefix, idx, addVoiceChannel(channels, prefix, container, idx));
        // Restore channel state from payload if present
        if (voice._channelState && channel) {
            applyVoiceChannelState(channel, voice._channelState);
            delete voice._channelState;
        }
    });
    updateVoiceInstrumentLabels(lane);
}

/**
 * Applies voice channel state (instrument, volume, mute) from a share payload.
 * Exported for use by share.js.
 */
function applyVoiceChannelState(channel, voiceState) {
    if (!channel || !voiceState) return;

    const sound = voiceState.i ?? voiceState.instrument;
    const volume = voiceState.v ?? voiceState.volume;
    const muted = voiceState.u ?? voiceState.muted;

    if (sound && channel.soundEl) {
        const hasSoundOption = Array.from(channel.soundEl.options).some(opt => opt.value === sound);
        if (hasSoundOption) {
            channel.soundEl.value = sound;
            channel.sound = sound;
        }
    }

    if (typeof volume === 'number' && Number.isFinite(volume)) {
        channel.volume = Math.max(0, Math.min(1, volume));
        if (channel.volEl) channel.volEl.value = String(channel.volume);
    }

    if (muted !== undefined) {
        channel.muted = !!muted;
        if (channel.muteEl) {
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        }
    }
}

/**
 * Initializes voice channels for all multi-voice groups.
 */
function initVoiceChannels() {
    // Master voices
    const masterContainer = ui.masterVoiceContainer;
    if (masterContainer) {
        lanes.master.voices.forEach((_, idx) => {
            createVoiceStripDOM(masterContainer, 'master', idx, '#ff9100', MIXER_LABELS.master);
            bindChannelToVoice('master', idx, addVoiceChannel(channels, 'master', masterContainer, idx));
        });
    }

    // A phrase voices
    const aContainer = ui.AVoiceContainer;
    if (aContainer) {
        lanes.Aphrase.voices.forEach((_, idx) => {
            createVoiceStripDOM(aContainer, 'A', idx, '#ff3366', MIXER_LABELS.A);
            bindChannelToVoice('A', idx, addVoiceChannel(channels, 'A', aContainer, idx));
        });
    }

    // B phrase voices
    const bContainer = ui.BVoiceContainer;
    if (bContainer) {
        lanes.Bphrase.voices.forEach((_, idx) => {
            createVoiceStripDOM(bContainer, 'B', idx, '#00e5ff', MIXER_LABELS.B);
            bindChannelToVoice('B', idx, addVoiceChannel(channels, 'B', bContainer, idx));
        });
    }
}

/**
 * Rebuilds the entire system after a meter or phrase cycle change.
 * Recalculates derived state, resizes lanes (preserving patterns),
 * rebuilds lane buttons, and resets the animation angle to zero.
 */
function rebuildSystem() {
    updateDerivedState(state);
    updatePhaseUI(state, ui);
    resizeAllLanes(state, lanes);
    buildAllLanes(lanes);
    state.mainAngle = 0;
    syncAudioStartTime(state);
    resetAudioScheduler(state);
    updateWorkerScheduler(state, lanes, channels, cachedGlobalVolume);
}

/**
 * Resets the animation and patterns without changing any user settings.
 * Used by the "Sync System" button.
 */
function resetAndRebuild() {
    state.mainAngle = 0;
    syncAudioStartTime(state);
    resetAudioScheduler(state);
    updateWorkerScheduler(state, lanes, channels, cachedGlobalVolume);
    resetFlashState(state);
    resetPatterns(state, lanes);
    buildAllLanes(lanes);
}

function resetFixedChannel(channel, defaults) {
    if (!channel || !defaults) return;

    channel.sound = defaults.sound;
    channel.volume = defaults.volume;
    channel.muted = defaults.muted;

    if (channel.soundEl) channel.soundEl.value = defaults.sound;
    if (channel.volEl) channel.volEl.value = String(defaults.volume);
    if (channel.muteEl) {
        channel.muteEl.classList.toggle('muted', defaults.muted);
        channel.muteEl.textContent = defaults.muted ? 'Muted' : 'Mute';
    }
}

function resetLaneVoicesToSingle(lane) {
    lane.voices = [lane.voices[0] || { selected: [], buttons: [], nudgeOffset: 0, channel: null }];
    lane.voices[0].channel = null;
}

function resetMixerToStartingState() {
    ui.selectA.value = String(STARTING_MIXER_STATE.A);
    ui.selectB.value = String(STARTING_MIXER_STATE.B);
    ui.phraseCyclesA.value = String(STARTING_MIXER_STATE.phraseCyclesA);
    ui.phraseCyclesB.value = String(STARTING_MIXER_STATE.phraseCyclesB);
    ui.masterPhraseCycles.value = String(STARTING_MIXER_STATE.masterPhraseCycles);
    ui.tempoSlider.value = String(STARTING_MIXER_STATE.tempo);
    ui.tempoLabel.textContent = String(STARTING_MIXER_STATE.tempo);
    ui.masterVolumeSlider.value = String(STARTING_MIXER_STATE.masterVolume);
    ui.masterVolumeLabel.textContent = String(STARTING_MIXER_STATE.masterVolume);
    cachedGlobalVolume = STARTING_MIXER_STATE.masterVolume / 100;

    state.A = STARTING_MIXER_STATE.A;
    state.B = STARTING_MIXER_STATE.B;
    state.phraseCyclesA = STARTING_MIXER_STATE.phraseCyclesA;
    state.phraseCyclesB = STARTING_MIXER_STATE.phraseCyclesB;
    state.masterPhraseCycles = STARTING_MIXER_STATE.masterPhraseCycles;
    state.phaseA = 0;
    state.phaseB = 0;
    state.tempo = STARTING_MIXER_STATE.tempo;

    resetFixedChannel(channels.driver, STARTING_MIXER_STATE.fixedChannels.driver);
    resetFixedChannel(channels.Awheel, STARTING_MIXER_STATE.fixedChannels.Awheel);
    resetFixedChannel(channels.Bwheel, STARTING_MIXER_STATE.fixedChannels.Bwheel);

    resetLaneVoicesToSingle(lanes.master);
    resetLaneVoicesToSingle(lanes.Aphrase);
    resetLaneVoicesToSingle(lanes.Bphrase);

    updateDerivedState(state);
    updatePhaseUI(state, ui);
    resetFlashState(state);
    resetPatterns(state, lanes);
    rebuildAllVoiceMixerStrips();
    buildAllLanes(lanes);
    state.mainAngle = 0;
    syncAudioStartTime(state);
    resetAudioScheduler(state);
    updateWorkerScheduler(state, lanes, channels, cachedGlobalVolume);
}

function rebuildAllVoiceMixerStrips() {
    rebuildVoiceMixerStrips('master', ui.masterVoiceContainer, '#ff9100', MIXER_LABELS.master);
    rebuildVoiceMixerStrips('A', ui.AVoiceContainer, '#ff3366', MIXER_LABELS.A);
    rebuildVoiceMixerStrips('B', ui.BVoiceContainer, '#00e5ff', MIXER_LABELS.B);
}

/**
 * Adds a new voice to a lane group and creates its channel/strip.
 */
function handleAddVoice(lane, prefix, container, color, label) {
    addVoice(lane);
    const voiceIndex = lane.voices.length - 1;
    createVoiceStripDOM(container, prefix, voiceIndex, color, label);
    bindChannelToVoice(prefix, voiceIndex, addVoiceChannel(channels, prefix, container, voiceIndex));
    buildLane(lane); // Only rebuild the affected lane, not all lanes
}

/**
 * Removes a voice's mixer strip and channel (called by lane's onRemoveVoice callback).
 * The lane data and sequencer buttons are already handled by lanes.js.
 */
function handleRemoveVoiceChannel(prefix, voiceIndex) {
    const key = voiceChannelKeyForPrefix(prefix);
    const voiceArray = channels[key];
    if (!voiceArray || voiceArray.length <= 1) return;

    // Remove the specific strip DOM element
    const stripEl = document.getElementById(`strip_${prefix}_${voiceIndex}`);
    if (stripEl) stripEl.remove();

    // Remove channel from array
    voiceArray.splice(voiceIndex, 1);

    // Re-index remaining strips' labels
    const lane = laneForPrefix(prefix);

    // Update channel references and strip IDs, including child elements
    voiceArray.forEach((ch, idx) => {
        const oldSuffix = `${prefix}_${ch.voiceIndex}`;
        const newSuffix = `${prefix}_${idx}`;
        // Update channel voiceIndex
        ch.voiceIndex = idx;
        ch.onInstrumentChange = () => updateVoiceInstrumentLabels(lane);
        // Update strip div and all child element IDs
        const strip = document.getElementById(`strip_${oldSuffix}`);
        if (strip) {
            strip.id = `strip_${newSuffix}`;
            const soundEl = document.getElementById(`sound_${oldSuffix}`);
            if (soundEl) soundEl.id = `sound_${newSuffix}`;
            const muteEl = document.getElementById(`mute_${oldSuffix}`);
            if (muteEl) muteEl.id = `mute_${newSuffix}`;
            const volEl = document.getElementById(`vol_${oldSuffix}`);
            if (volEl) volEl.id = `vol_${newSuffix}`;
        }
        // Update voice reference
        lane.voices[idx].channel = ch;
    });

    buildLane(lane); // Only rebuild the affected lane
}

// Shared dependency bag passing to share and animation functions
const shareDeps = {
    state,
    ui,
    lanes,
    channels,
    updateDerivedState,
    updatePhaseUI,
    resetPatterns,
    buildAllLanes,
    resetFlashState,
    applyVoiceChannelState,
    syncAudioStartTime,
    resetAudioScheduler
};

// Phase 3: Initialize derived state and populate UI
updateDerivedState(state);
populateMenus(channels);
wireChannels(channels);
wireLaneClearButtons(lanes);
wireLaneInfoButtons(lanes);

// Cache global volume to avoid Number.parseInt per trigger
let cachedGlobalVolume = Number.parseInt(ui.masterVolumeSlider.value, 10) / 100;
ui.masterVolumeSlider.addEventListener('input', () => {
    cachedGlobalVolume = Number.parseInt(ui.masterVolumeSlider.value, 10) / 100;
    updateWorkerScheduler(state, lanes, channels, cachedGlobalVolume);
});

// Phase 4: Initialize voice channels
initVoiceChannels();

// Set up remove callbacks for each lane
lanes.master.onRemoveVoice = (voiceIndex) => {
    handleRemoveVoiceChannel('master', voiceIndex);
};
lanes.Aphrase.onRemoveVoice = (voiceIndex) => {
    handleRemoveVoiceChannel('A', voiceIndex);
};
lanes.Bphrase.onRemoveVoice = (voiceIndex) => {
    handleRemoveVoiceChannel('B', voiceIndex);
};

// Phase 5: Wire add/remove voice buttons
ui.addMasterVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.master, 'master', ui.masterVoiceContainer, '#ff9100', MIXER_LABELS.master);
});

ui.addAPhraseVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.Aphrase, 'A', ui.AVoiceContainer, '#ff3366', MIXER_LABELS.A);
});

ui.addBPhraseVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.Bphrase, 'B', ui.BVoiceContainer, '#00e5ff', MIXER_LABELS.B);
});

// Phase 6: Wire all user controls
wireControls({
    ui,
    state,
    rebuildSystem,
    resetMixerToStartingState,
    toggleAudio: async () => {
        await toggleAudio(state, ui);
        if (state.audioEnabled) {
            startAudioScheduler(state, lanes, channels, () => cachedGlobalVolume);
        } else {
            stopAudioScheduler();
        }
    },
    onShare: () => copyShareLink(shareDeps),
    onOpenSaveRhythm: () => openSaveRhythmModal(ui, shareDeps),
    onConfirmSaveRhythm: () => saveCurrentRhythm(shareDeps),
    onCloseSaveRhythm: () => closeSaveRhythmModal(ui),
    onOpenSavedRhythms: () => openSavedRhythmsModal(ui, shareDeps, rebuildAllVoiceMixerStrips),
    onCloseSavedRhythms: () => closeSavedRhythmsModal(ui)
});

// Phase 7: Build initial lane patterns and attempt to load shared state
resetPatterns(state, lanes);
updatePhaseUI(state, ui);
buildAllLanes(lanes);

// Async initialization: load shared state from URL, then start animation
(async () => {
    const loadedFromUrl = await loadStateFromUrl(shareDeps);

    // If loaded from URL, rebuild voice mixer strips to match restored voices
    if (loadedFromUrl) {
        rebuildAllVoiceMixerStrips();
    }

    // Phase 8: Show help modal for first-time visitors
    if (shouldAutoOpenHelpModal()) {
        openHelpModal(ui);
    } else {
        closeHelpModal(ui, { remember: false });
    }

    // Phase 9: Start the animation loop
    startAnimation({
        canvas,
        ctx,
        ui,
        state,
        lanes,
        markCurrentButtons: (active, previousActive) => markCurrentButtons(state, lanes, active, previousActive)
    });
})();

// Handle viewport resize and orientation change on mobile devices.
// The canvas scales via CSS (width:100%; height:auto), so the render loop
// does not need coordinate changes. Reading canvas.offsetWidth forces the
// browser to reflow the canvas container — important on iOS after rotation.
window.addEventListener('resize', function () {
    requestAnimationFrame(function () {
        void canvas.offsetWidth;
    });
});
