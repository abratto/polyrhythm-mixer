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
import { createLanes, resetPatterns, resizeAllLanes, buildAllLanes, buildLane, wireLaneClearButtons, wireLaneInfoButtons, markCurrentButtons, addVoice, updateVoiceInstrumentLabels, applyMixVisuals, addLaneEditControls, setMixChannels, wireLaneMixButtons } from './lanes.js';
import { createChannels, populateMenus, wireChannels, toggleAudio, addVoiceChannel, syncAudioStartTime, startAudioScheduler, stopAudioScheduler, resetAudioScheduler, populateInstrumentSelect, refreshSilenced } from './audio.js';
import { wireControls, shouldAutoOpenHelpModal, openHelpModal, closeHelpModal } from './controls.js';
import { copyShareLink, loadStateFromUrl, applyChannelState } from './share.js';
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
        driver: { sound: 'kick', volume: 0.6, muted: false },
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
// Let lane-rendered Solo/Mute controls reach the audio engine.
setMixChannels(channels);

// Keep lane visuals in sync with mixer mute/solo state. Each lane voice holds
// a reference to its audio channel; refreshSilenced() computes the effective
// "silenced" flag and calls this callback so lanes can dim/suppress.
channels.onMixChange = () => applyMixVisuals(lanes, channels);

// Single-voice wheel lanes also map to a mixer channel (the fixed Awheel/Bwheel strips).
lanes.Awheel.channel = channels.Awheel;
lanes.Bwheel.channel = channels.Bwheel;

const PREFIX_CONFIG = {
    master: { lane: lanes.master,  voiceKey: 'masterVoices', container: ui.masterVoiceContainer, color: '#ff9100', label: 'Master' },
    A:      { lane: lanes.Aphrase, voiceKey: 'Avoices',      container: ui.AVoiceContainer,      color: '#ff3366', label: 'Meter A Phrase' },
    B:      { lane: lanes.Bphrase, voiceKey: 'Bvoices',      container: ui.BVoiceContainer,      color: '#00e5ff', label: 'Meter B Phrase' }
};

function laneForPrefix(prefix) { return PREFIX_CONFIG[prefix].lane; }
function voiceChannelKeyForPrefix(prefix) { return PREFIX_CONFIG[prefix].voiceKey; }

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
function rebuildVoiceMixerStrips(prefix) {
    const cfg = PREFIX_CONFIG[prefix];
    const lane = cfg.lane;
    channels[cfg.voiceKey] = [];
    lane.voices.forEach((voice, idx) => {
        const channel = bindChannelToVoice(prefix, idx, addVoiceChannel(channels, prefix, cfg.container, idx));
        if (voice._channelState && channel) {
            applyVoiceChannelState(channel, voice._channelState);
            delete voice._channelState;
        }
    });
    updateVoiceInstrumentLabels(lane);
}

/**
 * Applies voice channel state (instrument, volume, mute) from a share payload.
 */
function applyVoiceChannelState(channel, voiceState) {
    applyChannelState(channel, voiceState, 'i');
}

/**
 * Initializes voice channels for all multi-voice groups.
 */
function initVoiceChannels() {
    // Voice volume faders now live inside each voice row (built by buildVoiceButtons),
    // so we only create the channel objects here — no Sound Mixer strip DOM.
    const groups = [
        { prefix: 'master', lane: lanes.master },
        { prefix: 'A', lane: lanes.Aphrase },
        { prefix: 'B', lane: lanes.Bphrase }
    ];
    groups.forEach(({ prefix, lane }) => {
        lane.voices.forEach((_, idx) => {
            bindChannelToVoice(prefix, idx, addVoiceChannel(channels, prefix, null, idx));
        });
    });
}

/**
 * Creates the fixed (single-voice) instrument selectors inline in their lanes:
 * the master wheel sound in the Master lane header, and the Meter A/B wheel
 * sounds in each wheel lane's toolbar. Created once; they live outside the
 * rebuilt grid so they persist across meter/phrase changes (unlike the
 * per-voice selectors, which are rebuilt with each voice row).
 */
function createFixedLaneInstrumentSelects() {
    const mountForGrid = (gridId) =>
        document.getElementById(gridId)?.closest('.matrix-row')?.querySelector('.lane-actions') || null;

    const defs = [
        { id: 'soundDriver', channel: channels.driver, mount: document.getElementById('masterBeatControls'), color: '#ff9100' },
        { id: 'soundAWheel', channel: channels.Awheel, mount: mountForGrid('meterAWheelGrid'), color: '#ff6b8f' },
        { id: 'soundBWheel', channel: channels.Bwheel, mount: mountForGrid('meterBWheelGrid'), color: '#6ef2ff' }
    ];

    defs.forEach(({ id, channel, mount, color }) => {
        if (!mount || !channel) return;
        const select = document.createElement('select');
        select.id = id;
        select.className = 'lane-instrument-select';
        select.style.color = color;
        populateInstrumentSelect(select, channel.sound);
        select.addEventListener('change', () => { channel.sound = select.value; });
        channel.soundEl = select;
        mount.appendChild(select);
    });
}

function _syncAudioAndVisualState() {
    state.followPlayhead = { master: true, Aphrase: true, Bphrase: true };
    state.visibleCycle = { master: 0, Aphrase: 0, Bphrase: 0 };
    state.mainAngle = 0;
    syncAudioStartTime(state);
    resetAudioScheduler(state);
}

/**
 * Rebuilds the entire system after a meter or phrase cycle change.
 * Recalculates derived state, resizes lanes (preserving patterns),
 * rebuilds lane buttons, and resets the animation angle to zero.
 */
function rebuildSystem(resetWheels = false) {
    _syncAudioAndVisualState();
    updateDerivedState(state);
    updatePhaseUI(state, ui);
    resizeAllLanes(state, lanes);
    if (resetWheels) {
        // Recalculate wheel lane onset positions when the polyrhythm grouping
        // changes (mainTeeth shifts, so old per-tooth positions are invalid).
        // Phrase-cycle changes don't affect mainTeeth — skip to preserve patterns.
        lanes.Awheel.selected.fill(false);
        lanes.Bwheel.selected.fill(false);
        for (let g = 0; g < state.A; g++) {
            lanes.Awheel.selected[(g * state.teethA + state.phaseA) % state.mainTeeth] = true;
        }
        for (let g = 0; g < state.B; g++) {
            lanes.Bwheel.selected[(g * state.teethB + state.phaseB) % state.mainTeeth] = true;
        }
    }
    buildAllLanes(lanes, state);
    refreshSilenced(channels);
    updateBeatSchemeSummary();
}

/** One-line summary of the current meter ratio shown in the Polyrhythm Beat Scheme header. */
function updateBeatSchemeSummary() {
    if (!ui.beatSchemeSummary) return;
    ui.beatSchemeSummary.textContent = `— ${state.A} against ${state.B}`;
    const sub = document.querySelector('.pulses-section .lane-group-sub');
    if (sub) sub.textContent = `(${state.mainTeeth} pulses per cycle)`;
}

/**
 * Resets the animation and patterns without changing any user settings.
 * Used by the "Sync System" button.
 */
function resetAndRebuild() {
    _syncAudioAndVisualState();
    resetFlashState(state);
    resetPatterns(state, lanes);
    buildAllLanes(lanes, state);
}

function resetFixedChannel(channel, defaults) {
    if (!channel || !defaults) return;

    channel.sound = defaults.sound;
    channel.volume = defaults.volume;
    channel.muted = defaults.muted;
    channel.soloed = false;

    if (channel.soundEl) channel.soundEl.value = defaults.sound;
    if (channel.volEl) channel.volEl.value = String(defaults.volume);
    if (channel.muteEl) {
        channel.muteEl.classList.toggle('muted', defaults.muted);
        channel.muteEl.textContent = defaults.muted ? 'Muted' : 'Mute';
    }
    if (channel.soloEl) {
        channel.soloEl.classList.remove('soloed');
        channel.soloEl.textContent = 'Solo';
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
    state.followPlayhead = { master: true, Aphrase: true, Bphrase: true };
    state.visibleCycle = { master: 0, Aphrase: 0, Bphrase: 0 };

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
    buildAllLanes(lanes, state);
    state.mainAngle = 0;
    syncAudioStartTime(state);
    resetAudioScheduler(state);
    refreshSilenced(channels);
}

function rebuildAllVoiceMixerStrips() {
    Object.keys(PREFIX_CONFIG).forEach(prefix => rebuildVoiceMixerStrips(prefix));
}

/**
 * Adds a new voice to a lane group and creates its channel/strip.
 */
function handleAddVoice(lane, prefix, container, color, label) {
    addVoice(lane);
    const voiceIndex = lane.voices.length - 1;
    bindChannelToVoice(prefix, voiceIndex, addVoiceChannel(channels, prefix, container, voiceIndex));
    buildLane(lane, state); // Only rebuild the affected lane, not all lanes
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

    buildLane(lane, state); // Only rebuild the affected lane
}

/** Keeps the Play/Pause button label and active state in sync with transport. */
function syncPlayButton() {
    if (!ui.playBtn) return;
    ui.playBtn.textContent = state.playing ? 'Pause' : 'Play';
    ui.playBtn.classList.toggle('active', state.playing);
}

/** Play/Pause toggle. If audio isn't unlocked yet, the first click does that too. */
async function handlePlayPause() {
    if (!state.audioEnabled) {
        await toggleAudio(state, ui);
        if (state.playing) {
            // user clicked Pause — enable audio and actually pause
            state.playing = false;
            state.transport = 'paused';
            stopAudioScheduler();
            syncPlayButton();
            return;
        }
        state.playing = true;
        state.transport = 'playing';
        syncAudioStartTime(state);
        startAudioScheduler(state, lanes, channels, getGlobalVolume);
        syncPlayButton();
        return;
    }
    if (state.playing) {
        state.playing = false;
        state.transport = 'paused';
        stopAudioScheduler();
    } else {
        state.playing = true;
        state.transport = 'playing';
        if (state.audioCtx && state.audioCtx.state === 'suspended') state.audioCtx.resume();
        syncAudioStartTime(state);
        startAudioScheduler(state, lanes, channels, getGlobalVolume);
    }
    syncPlayButton();
}

/** Stop: halt the groove and return the playhead to the start of the pattern. */
function handleStop() {
    state.playing = false;
    state.transport = 'stopped';
    stopAudioScheduler();
    state.mainAngle = 0;
    state.followPlayhead = { master: true, Aphrase: true, Bphrase: true };
    state.visibleCycle = { master: 0, Aphrase: 0, Bphrase: 0 };
    if (state.audioCtx) state.audioStartTime = state.audioCtx.currentTime;
    syncPlayButton();
    if (ui.transportReadout) ui.transportReadout.textContent = 'Stopped';
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
    syncAudioStartTime,
    resetAudioScheduler
};

// Phase 3: Initialize derived state and populate UI
updateDerivedState(state);
populateMenus(channels);
wireChannels(channels);
wireLaneClearButtons(lanes, state);
wireLaneInfoButtons(lanes);

// Cache global volume to avoid Number.parseInt per trigger
let cachedGlobalVolume = Number.parseInt(ui.masterVolumeSlider.value, 10) / 100;
// Effective global volume: 0 while audio output is disabled (a pure mute /
// "global volume zero"), otherwise the user's master volume. Fed to both the
// main scheduler and the worker so muting silences everything.
const getGlobalVolume = () => state.audioEnabled ? cachedGlobalVolume : 0;
ui.masterVolumeSlider.addEventListener('input', () => {
    cachedGlobalVolume = Number.parseInt(ui.masterVolumeSlider.value, 10) / 100;
});

// Phase 4b: Wire transport (Play/Pause + Stop) — separate from audio unlock
if (ui.playBtn) ui.playBtn.addEventListener('click', handlePlayPause);
if (ui.stopBtn) ui.stopBtn.addEventListener('click', handleStop);
syncPlayButton();

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
    handleAddVoice(lanes.master, 'master', ui.masterVoiceContainer, '#ff9100', PREFIX_CONFIG.master.label);
});

ui.addAPhraseVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.Aphrase, 'A', ui.AVoiceContainer, '#ff3366', PREFIX_CONFIG.A.label);
});

ui.addBPhraseVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.Bphrase, 'B', ui.BVoiceContainer, '#00e5ff', PREFIX_CONFIG.B.label);
});

// Phase 6: Wire all user controls
wireControls({
    ui,
    state,
    lanes,
    rebuildSystem,
    resetMixerToStartingState,
    toggleAudio: async () => {
        await toggleAudio(state, ui);
        // Enable/Disable Audio is an output mute: keep the groove running,
        // just feed 0 global volume when disabled. Start the scheduler only
        // if we're actually playing (otherwise paused stays paused).
        if (state.audioEnabled && state.playing) {
            startAudioScheduler(state, lanes, channels, getGlobalVolume);
        }
        syncPlayButton();
    },
    onShare: () => copyShareLink(shareDeps),
    onOpenSaveRhythm: () => openSaveRhythmModal(ui, shareDeps),
    onConfirmSaveRhythm: () => saveCurrentRhythm(shareDeps),
    onCloseSaveRhythm: () => closeSaveRhythmModal(ui),
    onOpenSavedRhythms: () => openSavedRhythmsModal(ui, shareDeps, () => {
        rebuildAllVoiceMixerStrips();
        // rebuild the lane DOM now that voice.channel is linked
        buildAllLanes(lanes, state);
        wireLaneMixButtons(lanes, channels);
        applyMixVisuals(lanes, channels);
    }),
    onCloseSavedRhythms: () => closeSavedRhythmsModal(ui)
});

// Phase 7: Build initial lane patterns and attempt to load shared state
resetPatterns(state, lanes);
updatePhaseUI(state, ui);
buildAllLanes(lanes, state);
updateBeatSchemeSummary();
createFixedLaneInstrumentSelects();
// Mount Solo/Mute inside the lanes (single-channel + master wheel) now that the
// lane toolbars exist; per-voice Solo/Mute are created in each voice row above.
// Add per-lane editing controls (randomize / reverse) before wireLaneMixButtons
// so the phrase lane reorder inside it can position the edit controls correctly.
Object.values(lanes).forEach(lane => addLaneEditControls(lane, state));

wireLaneMixButtons(lanes, channels);

// Initialize mix-driven lane visuals (dim when muted / solo-excluded)
refreshSilenced(channels);

// Async initialization: load shared state from URL, then start animation
(async () => {
    const loadedFromUrl = await loadStateFromUrl(shareDeps);

    // If loaded from URL, rebuild voice mixer strips to match restored voices
    if (loadedFromUrl) {
        rebuildAllVoiceMixerStrips();
        refreshSilenced(channels);
        // rebuild the lane DOM now that voice.channel is linked so per-voice
        // volume / solo / mute / clear controls are rendered
        buildAllLanes(lanes, state);
        wireLaneMixButtons(lanes, channels);
        applyMixVisuals(lanes, channels);
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
        channels,
        markCurrentButtons: (active, previousActive) => markCurrentButtons(state, lanes, active, previousActive),
        buildLane: (lane) => buildLane(lane, state)
    });
})();

// Handle viewport resize and orientation change on mobile devices.
// The canvas scales via CSS (width:100%; height:auto), so the render loop
// does not need coordinate changes. Reading canvas.offsetWidth forces the
// browser to reflow the canvas container — important on iOS after rotation.
let _resizeDebounce = null;
window.addEventListener('resize', () => {
    if (_resizeDebounce) return;
    _resizeDebounce = requestAnimationFrame(() => {
        void canvas.offsetWidth;
        _resizeDebounce = null;
    });
});
