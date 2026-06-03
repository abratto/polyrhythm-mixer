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
import { createLanes, resetPatterns, resizeAllLanes, buildAllLanes, buildLane, wireLaneClearButtons, markCurrentButtons, addVoice, removeVoice } from './lanes.js';
import { createChannels, populateMenus, wireChannels, toggleAudio, playChannelSound, addVoiceChannel, removeVoiceChannel } from './audio.js';
import { wireControls, shouldAutoOpenHelpModal, openHelpModal, closeHelpModal } from './controls.js';
import { copyShareLink, loadStateFromUrl } from './share.js';
import { startAnimation } from './render.js';

// Phase 1: Collect all DOM element references
const { canvas, ctx, ui } = getDomRefs();

// Phase 2: Create core data structures
const state = createState(ui);
const lanes = createLanes(ui, state);
const channels = createChannels();

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

/**
 * Rebuilds voice mixer strips to match the current voice count.
 * Used after loading a share URL with multiple voices.
 */
function rebuildVoiceMixerStrips(prefix, container, color, label) {
    const lane = prefix === 'master' ? lanes.master : prefix === 'A' ? lanes.Aphrase : lanes.Bphrase;
    const key = prefix === 'master' ? 'masterVoices' : prefix === 'A' ? 'Avoices' : 'Bvoices';
    container.innerHTML = '';
    channels[key] = [];
    lane.voices.forEach((voice, idx) => {
        createVoiceStripDOM(container, prefix, idx, color, label);
        const channel = addVoiceChannel(channels, prefix, container, idx);
        voice.channel = channel;
        // Restore channel state from payload if present
        if (voice._channelState && channel) {
            applyVoiceChannelState(channel, voice._channelState);
            delete voice._channelState;
        }
    });
}

/**
 * Applies voice channel state (instrument, volume, mute) from a share payload.
 * Exported for use by share.js.
 */
function applyVoiceChannelState(channel, voiceState) {
    if (!channel || !voiceState) return;

    if (voiceState.instrument && channel.soundEl) {
        const hasSoundOption = Array.from(channel.soundEl.options).some(opt => opt.value === voiceState.instrument);
        if (hasSoundOption) {
            channel.soundEl.value = voiceState.instrument;
            channel.sound = voiceState.instrument;
        }
    }

    if (typeof voiceState.volume === 'number' && Number.isFinite(voiceState.volume)) {
        channel.volume = Math.max(0, Math.min(1, voiceState.volume));
        if (channel.volEl) channel.volEl.value = String(channel.volume);
    }

    if (voiceState.muted !== undefined) {
        channel.muted = !!voiceState.muted;
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
            createVoiceStripDOM(masterContainer, 'master', idx, '#ff9100', 'Master');
            addVoiceChannel(channels, 'master', masterContainer, idx);
        });
    }

    // A phrase voices
    const aContainer = ui.AVoiceContainer;
    if (aContainer) {
        lanes.Aphrase.voices.forEach((_, idx) => {
            createVoiceStripDOM(aContainer, 'A', idx, '#ff3366', 'A Phrase');
            addVoiceChannel(channels, 'A', aContainer, idx);
        });
    }

    // B phrase voices
    const bContainer = ui.BVoiceContainer;
    if (bContainer) {
        lanes.Bphrase.voices.forEach((_, idx) => {
            createVoiceStripDOM(bContainer, 'B', idx, '#00e5ff', 'B Phrase');
            addVoiceChannel(channels, 'B', bContainer, idx);
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
}

/**
 * Resets the animation and patterns without changing any user settings.
 * Used by the "Sync System" button.
 */
function resetAndRebuild() {
    state.mainAngle = 0;
    resetFlashState(state);
    resetPatterns(state, lanes);
    buildAllLanes(lanes);
}

/**
 * Adds a new voice to a lane group and creates its channel/strip.
 */
function handleAddVoice(lane, prefix, container, color, label) {
    addVoice(lane);
    const voiceIndex = lane.voices.length - 1;
    createVoiceStripDOM(container, prefix, voiceIndex, color, label);
    const channel = addVoiceChannel(channels, prefix, container, voiceIndex);
    lane.voices[voiceIndex].channel = channel;
    buildLane(lane); // Only rebuild the affected lane, not all lanes
}

/**
 * Removes a voice's mixer strip and channel (called by lane's onRemoveVoice callback).
 * The lane data and sequencer buttons are already handled by lanes.js.
 */
function handleRemoveVoiceChannel(prefix, voiceIndex) {
    const key = prefix === 'master' ? 'masterVoices' : prefix === 'A' ? 'Avoices' : 'Bvoices';
    const voiceArray = channels[key];
    if (!voiceArray || voiceArray.length <= 1) return;

    // Remove the specific strip DOM element
    const stripEl = document.getElementById(`strip_${prefix}_${voiceIndex}`);
    if (stripEl) stripEl.remove();

    // Remove channel from array
    voiceArray.splice(voiceIndex, 1);

    // Re-index remaining strips' labels
    const container = prefix === 'master' ? ui.masterVoiceContainer : prefix === 'A' ? ui.AVoiceContainer : ui.BVoiceContainer;
    const color = prefix === 'master' ? '#ff9100' : prefix === 'A' ? '#ff3366' : '#00e5ff';
    const label = prefix === 'master' ? 'Master' : prefix === 'A' ? 'A Phrase' : 'B Phrase';
    const lane = prefix === 'master' ? lanes.master : prefix === 'A' ? lanes.Aphrase : lanes.Bphrase;

    // Update channel references and strip IDs
    voiceArray.forEach((ch, idx) => {
        const oldId = `strip_${prefix}_${idx}`;
        const newId = `strip_${prefix}_${idx}`;
        // Update channel voiceIndex
        ch.voiceIndex = idx;
        // Update strip ID if it exists
        const strip = document.getElementById(oldId);
        if (strip) strip.id = newId;
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
    resetFlashState
};

// Phase 3: Initialize derived state and populate UI
updateDerivedState(state);
populateMenus(channels);
wireChannels(channels);
wireLaneClearButtons(lanes);

// Cache global volume to avoid parseInt per trigger
let cachedGlobalVolume = parseInt(ui.masterVolumeSlider.value, 10) / 100;
ui.masterVolumeSlider.addEventListener('input', () => {
    cachedGlobalVolume = parseInt(ui.masterVolumeSlider.value, 10) / 100;
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
    handleAddVoice(lanes.master, 'master', ui.masterVoiceContainer, '#ff9100', 'Master');
});

ui.addAPhraseVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.Aphrase, 'A', ui.AVoiceContainer, '#ff3366', 'A Phrase');
});

ui.addBPhraseVoiceBtn.addEventListener('click', () => {
    handleAddVoice(lanes.Bphrase, 'B', ui.BVoiceContainer, '#00e5ff', 'B Phrase');
});

// Phase 6: Wire all user controls
wireControls({
    ui,
    state,
    rebuildSystem,
    resetAndRebuild,
    toggleAudio: () => toggleAudio(state, ui),
    onShare: () => copyShareLink(shareDeps)
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
        rebuildVoiceMixerStrips('master', ui.masterVoiceContainer, '#ff9100', 'Master');
        rebuildVoiceMixerStrips('A', ui.AVoiceContainer, '#ff3366', 'A Phrase');
        rebuildVoiceMixerStrips('B', ui.BVoiceContainer, '#00e5ff', 'B Phrase');
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
        playChannelSound: (channelName, voiceIndex) => {
            return playChannelSound(state, channels, channelName, cachedGlobalVolume, voiceIndex);
         },
        markCurrentButtons: (active) => markCurrentButtons(state, lanes, active)
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
