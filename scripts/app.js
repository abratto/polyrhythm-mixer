/**
 * app.js — Application entry point and initialization.
 *
 * Bootstraps the polyrhythm mixer by:
 *   1. Collecting DOM references
 *   2. Creating state, lanes, and audio channels
 *   3. Wiring all UI controls to their handlers
 *   4. Attempting to load shared state from the URL
 *   5. Starting the canvas animation loop
 *
 * The initialization order is critical: state must be derived before
 * lanes are built, and controls must be wired before the animation
 * starts reading state values.
 */
import { getDomRefs } from './dom.js';
import { createState, resetFlashState, updateDerivedState, updatePhaseUI } from './state.js';
import { createLanes, resetPatterns, resizeAllLanes, buildAllLanes, wireLaneClearButtons, markCurrentButtons } from './lanes.js';
import { createChannels, populateMenus, wireChannels, toggleAudio, playChannelSound } from './audio.js';
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

// Shared dependency bag passed to share and animation functions
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

// Phase 4: Wire all user controls
wireControls({
    ui,
    state,
    rebuildSystem,
    resetAndRebuild,
    toggleAudio: () => toggleAudio(state, ui),
    onShare: () => copyShareLink(shareDeps)
});

// Phase 5: Build initial lane patterns and attempt to load shared state
resetPatterns(state, lanes);
updatePhaseUI(state, ui);
buildAllLanes(lanes);
loadStateFromUrl(shareDeps);

// Phase 6: Show help modal for first-time visitors
if (shouldAutoOpenHelpModal()) {
    openHelpModal(ui);
} else {
    closeHelpModal(ui, { remember: false });
}

// Phase 7: Start the animation loop
startAnimation({
    canvas,
    ctx,
    ui,
    state,
    lanes,
    playChannelSound: (channelName) => {
        const globalVol = parseInt(ui.masterVolumeSlider.value, 10) / 100;
        return playChannelSound(state, channels, channelName, globalVol);
    },
    markCurrentButtons: (active) => markCurrentButtons(lanes, active)
});

// Handle viewport resize and orientation change on mobile devices.
// The canvas scales via CSS (width:100%; height:auto), so the render loop
// does not need coordinate changes. Reading canvas.offsetWidth forces the
// browser to reflow the canvas container — important on iOS after rotation.
window.addEventListener('resize', function () {
    requestAnimationFrame(function () {
        void canvas.offsetWidth;
    });
});
