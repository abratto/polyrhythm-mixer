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
        // Phrase length selectors (number of master cycles per phrase)
        phraseCyclesA: document.getElementById('phraseCyclesA'),
        phraseCyclesB: document.getElementById('phraseCyclesB'),
        // Phase offset sliders and their numeric labels
        phaseSliderA: document.getElementById('phaseA'),
        phaseSliderB: document.getElementById('phaseB'),
        phaseLabelA: document.getElementById('phaseALabel'),
        phaseLabelB: document.getElementById('phaseBLabel'),
        // Global tempo slider (BPM) and its display label
        tempoSlider: document.getElementById('tempoSlider'),
        tempoLabel: document.getElementById('tempoLabel'),
        // Master volume slider and its display label
        masterVolumeSlider: document.getElementById('masterVolumeSlider'),
        masterVolumeLabel: document.getElementById('masterVolumeLabel'),
        // Action buttons
        resetBtn: document.getElementById('resetBtn'),
        audioBtn: document.getElementById('audioBtn'),
        helpBtn: document.getElementById('helpBtn'),
        shareBtn: document.getElementById('shareBtn'),

        // Help modal elements
        helpModal: document.getElementById('helpModal'),
        closeHelpModalBtn: document.getElementById('closeHelpModalBtn'),

        // Sequencer grid containers for each lane
        masterGrid: document.getElementById('masterGrid'),
        meterAPhraseGrid: document.getElementById('meterAPhraseGrid'),
        meterAWheelGrid: document.getElementById('meterAWheelGrid'),
        meterBPhraseGrid: document.getElementById('meterBPhraseGrid'),
        meterBWheelGrid: document.getElementById('meterBWheelGrid'),

        // Header containers for multi-voice lanes (contain title + clear + add voice button)
        masterHeaderContainer: document.getElementById('masterHeaderContainer'),
        meterAPhraseHeaderContainer: document.getElementById('meterAPhraseHeaderContainer'),
        meterBPhraseHeaderContainer: document.getElementById('meterBPhraseHeaderContainer'),

        // Add voice buttons for multi-voice lanes
        addMasterVoiceBtn: document.getElementById('addMasterVoiceBtn'),
        addAPhraseVoiceBtn: document.getElementById('addAPhraseVoiceBtn'),
        addBPhraseVoiceBtn: document.getElementById('addBPhraseVoiceBtn'),

        // Clear buttons for each lane's sequencer
        clearMasterBtn: document.getElementById('clearMasterBtn'),
        clearAPhraseBtn: document.getElementById('clearAPhraseBtn'),
        clearAWheelBtn: document.getElementById('clearAWheelBtn'),
        clearBPhraseBtn: document.getElementById('clearBPhraseBtn'),
        clearBWheelBtn: document.getElementById('clearBWheelBtn'),

        // Title/label elements that show descriptive text for each lane
        masterTitle: document.getElementById('masterTitle'),
        titleAPhrase: document.getElementById('titleAPhrase'),
        titleAWheel: document.getElementById('titleAWheel'),
        titleBPhrase: document.getElementById('titleBPhrase'),
        titleBWheel: document.getElementById('titleBWheel'),

        // Mixer console containers for dynamic voice strips
        masterVoiceContainer: document.getElementById('masterVoiceContainer'),
        AVoiceContainer: document.getElementById('AVoiceContainer'),
        BVoiceContainer: document.getElementById('BVoiceContainer')
    };

    return { canvas, ctx, ui };
}
