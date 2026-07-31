/**
 * lanes.js — Public API facade for lane management.
 */

export {
    createLanes, resetPatterns, resizeAllLanes, buildAllLanes, buildLane,
    wireLaneClearButtons, wireLaneInfoButtons, markCurrentButtons,
    addVoice, removeVoice, updateVoiceInstrumentLabels,
    applyMixVisuals, addLaneEditControls, setMixChannels, wireLaneMixButtons, updateVoiceStepsForCycle
} from './lane-ui.js';
