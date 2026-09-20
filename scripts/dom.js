/**
 * dom.js — DOM reference collector.
 *
 * Gathers all DOM elements the application needs into a single `ui` object
 * and returns it alongside the canvas and its 2D context. This avoids
 * repeated `document.getElementById` calls throughout the codebase.
 */
export function getDomRefs() {
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');

    const ui = {
        // Meter selectors (A and B rhythm values)
        selectA: document.getElementById('rhythmA'),
        selectB: document.getElementById('rhythmB'),
        // Parameterized summary of the current A × B polyrhythm beat scheme
        beatSchemeSummary: document.getElementById('beatSchemeSummary'),
        // Master phrase length (cycles the master lane pattern spans)
        masterPhraseCycles: document.getElementById('masterPhraseCycles'),
        // Global tempo slider (BPM) and its display label
        tempoSlider: document.getElementById('tempoSlider'),
        tempoLabel: document.getElementById('tempoLabel'),
        // Master volume slider and its display label
        masterVolumeSlider: document.getElementById('masterVolumeSlider'),
        masterVolumeLabel: document.getElementById('masterVolumeLabel'),

        // Left-rail "Expand all / Collapse all" controls
        expandAllRailsBtn: document.getElementById('expandAllRailsBtn'),
        collapseAllRailsBtn: document.getElementById('collapseAllRailsBtn'),

        // Follow-playhead toggle for scrollable sequence lanes
        followScrollBtn: document.getElementById('followScrollBtn'),

        // Visualization mode switcher (gears / rings / align / phase / shapes)
        vizModeGearsBtn: document.getElementById('vizModeGears'),
        vizModeRingsBtn: document.getElementById('vizModeRings'),
        vizModeAlignBtn: document.getElementById('vizModeAlign'),
        vizModeVoiceBtn: document.getElementById('vizModeVoice'),
        vizModeShapesBtn: document.getElementById('vizModeShapes'),

        // Action buttons
        resetBtn: document.getElementById('resetBtn'),
        audioBtn: document.getElementById('audioBtn'),
        playBtn: document.getElementById('playBtn'),
        stopBtn: document.getElementById('stopBtn'),
        transportReadout: document.getElementById('transportReadout'),
        miniPlayhead: document.getElementById('miniPlayhead'),
        helpBtn: document.getElementById('helpBtn'),
        saveRhythmBtn: document.getElementById('saveRhythmBtn'),
        loadRhythmBtn: document.getElementById('loadRhythmBtn'),
        shareBtn: document.getElementById('shareBtn'),

        // Help modal elements
        helpModal: document.getElementById('helpModal'),
        closeHelpModalBtn: document.getElementById('closeHelpModalBtn'),

        // Saved rhythms modal elements
        savedRhythmsModal: document.getElementById('savedRhythmsModal'),
        savedRhythmsStatus: document.getElementById('savedRhythmsStatus'),
        savedRhythmsList: document.getElementById('savedRhythmsList'),
        closeSavedRhythmsModalBtn: document.getElementById('closeSavedRhythmsModalBtn'),

        // Save rhythm modal elements
        saveRhythmModal: document.getElementById('saveRhythmModal'),
        saveRhythmNameInput: document.getElementById('saveRhythmNameInput'),
        cancelSaveRhythmBtn: document.getElementById('cancelSaveRhythmBtn'),
        confirmSaveRhythmBtn: document.getElementById('confirmSaveRhythmBtn'),

        // Sequencer grid containers for each lane
        masterGrid: document.getElementById('masterGrid'),
        meterAWheelGrid: document.getElementById('meterAWheelGrid'),
        meterBWheelGrid: document.getElementById('meterBWheelGrid'),

        // Add voice buttons for multi-voice lanes
        addMasterVoiceBtn: document.getElementById('addMasterVoiceBtn'),

        // Clear buttons for each lane's sequencer
        clearMasterBtn: document.getElementById('clearMasterBtn'),
        clearAWheelBtn: document.getElementById('clearAWheelBtn'),
        clearBWheelBtn: document.getElementById('clearBWheelBtn'),

        // Lane explanation toggles and copy
        masterInfoBtn: document.getElementById('masterInfoBtn'),
        aWheelInfoBtn: document.getElementById('aWheelInfoBtn'),
        bWheelInfoBtn: document.getElementById('bWheelInfoBtn'),
        masterDescription: document.getElementById('masterDescription'),
        aWheelDescription: document.getElementById('aWheelDescription'),
        bWheelDescription: document.getElementById('bWheelDescription'),

        // Visualization explanation toggle
        vizInfoBtn: document.getElementById('vizInfoBtn'),
        vizDescription: document.getElementById('vizDescription'),

        // Rhythm Tracks dynamic grouping lanes
        groupingLanesContainer: document.getElementById('groupingLanesContainer'),

        // Mixer console containers for dynamic voice strips
        masterVoiceContainer: document.getElementById('masterVoiceContainer')
    };

    return { canvas, ctx, ui };
}
