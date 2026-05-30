import { getDomRefs } from './dom.js';
import { createState, resetFlashState, updateDerivedState, updatePhaseUI } from './state.js';
import { createLanes, resetPatterns, buildAllLanes, wireLaneClearButtons, markCurrentButtons } from './lanes.js';
import { createChannels, populateMenus, wireChannels, toggleAudio, playChannelSound } from './audio.js';
import { wireControls, shouldAutoOpenHelpModal, openHelpModal, closeHelpModal } from './controls.js';
import { copyShareLink, loadStateFromUrl } from './share.js';
import { startAnimation } from './render.js';

const { canvas, ctx, ui } = getDomRefs();
const state = createState(ui);
const lanes = createLanes(ui, state);
const channels = createChannels();

function rebuildSystem() {
    updateDerivedState(state);
    updatePhaseUI(state, ui);
    resetPatterns(state, lanes);
    buildAllLanes(lanes);
    state.mainAngle = 0;
}

function resetAndRebuild() {
    state.mainAngle = 0;
    resetFlashState(state);
    resetPatterns(state, lanes);
    buildAllLanes(lanes);
}

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

updateDerivedState(state);
populateMenus(channels);
wireChannels(channels);
wireLaneClearButtons(lanes);
wireControls({
    ui,
    state,
    rebuildSystem,
    resetAndRebuild,
    toggleAudio: () => toggleAudio(state, ui),
    onShare: () => copyShareLink(shareDeps)
});
resetPatterns(state, lanes);
updatePhaseUI(state, ui);
buildAllLanes(lanes);
loadStateFromUrl(shareDeps);

if (shouldAutoOpenHelpModal()) {
    openHelpModal(ui);
} else {
    closeHelpModal(ui, { remember: false });
}

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
