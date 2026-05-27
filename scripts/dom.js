export function getDomRefs() {
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');

    const ui = {
        selectA: document.getElementById('rhythmA'),
        selectB: document.getElementById('rhythmB'),
        phraseCyclesA: document.getElementById('phraseCyclesA'),
        phraseCyclesB: document.getElementById('phraseCyclesB'),
        phaseSliderA: document.getElementById('phaseA'),
        phaseSliderB: document.getElementById('phaseB'),
        phaseLabelA: document.getElementById('phaseALabel'),
        phaseLabelB: document.getElementById('phaseBLabel'),
        speedSlider: document.getElementById('speed'),
        resetBtn: document.getElementById('resetBtn'),
        audioBtn: document.getElementById('audioBtn'),
        helpBtn: document.getElementById('helpBtn'),
        shareBtn: document.getElementById('shareBtn'),

        helpModal: document.getElementById('helpModal'),
        closeHelpModalBtn: document.getElementById('closeHelpModalBtn'),

        masterGrid: document.getElementById('masterGrid'),
        meterAPhraseGrid: document.getElementById('meterAPhraseGrid'),
        meterAWheelGrid: document.getElementById('meterAWheelGrid'),
        meterBPhraseGrid: document.getElementById('meterBPhraseGrid'),
        meterBWheelGrid: document.getElementById('meterBWheelGrid'),

        clearMasterBtn: document.getElementById('clearMasterBtn'),
        clearAPhraseBtn: document.getElementById('clearAPhraseBtn'),
        clearAWheelBtn: document.getElementById('clearAWheelBtn'),
        clearBPhraseBtn: document.getElementById('clearBPhraseBtn'),
        clearBWheelBtn: document.getElementById('clearBWheelBtn'),

        masterTitle: document.getElementById('masterTitle'),
        titleAPhrase: document.getElementById('titleAPhrase'),
        titleAWheel: document.getElementById('titleAWheel'),
        titleBPhrase: document.getElementById('titleBPhrase'),
        titleBWheel: document.getElementById('titleBWheel')
    };

    return { canvas, ctx, ui };
}
