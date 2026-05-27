import { lcm, phraseStepsFor } from './math.js';

export function createState(ui) {
    return {
        A: parseInt(ui.selectA.value, 10),
        B: parseInt(ui.selectB.value, 10),
        phraseCyclesA: parseInt(ui.phraseCyclesA.value, 10),
        phraseCyclesB: parseInt(ui.phraseCyclesB.value, 10),
        phaseA: parseInt(ui.phaseSliderA.value, 10),
        phaseB: parseInt(ui.phaseSliderB.value, 10),

        mainTeeth: 0,
        teethA: 0,
        teethB: 0,
        phraseStepsA: 0,
        phraseStepsB: 0,
        fullPatternCycles: 0,

        mainAngle: 0,
        audioCtx: null,
        audioEnabled: false,

        flash: { driver: 0, custom: 0, A: 0, B: 0 },
        lastActive: { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 }
    };
}

export function updateDerivedState(state) {
    state.mainTeeth = lcm(state.A, state.B);
    state.teethA = state.mainTeeth / state.A;
    state.teethB = state.mainTeeth / state.B;

    state.phraseStepsA = phraseStepsFor(state.A, state.phraseCyclesA);
    state.phraseStepsB = phraseStepsFor(state.B, state.phraseCyclesB);

    state.fullPatternCycles = lcm(state.phraseCyclesA, state.phraseCyclesB);
}

export function updatePhaseUI(state, ui) {
    ui.phaseSliderA.max = state.mainTeeth - 1;
    ui.phaseSliderB.max = state.mainTeeth - 1;

    if (state.phaseA >= state.mainTeeth) {
        state.phaseA = 0;
        ui.phaseSliderA.value = '0';
    }
    if (state.phaseB >= state.mainTeeth) {
        state.phaseB = 0;
        ui.phaseSliderB.value = '0';
    }

    ui.phaseLabelA.textContent = String(state.phaseA);
    ui.phaseLabelB.textContent = String(state.phaseB);
}

export function resetFlashState(state) {
    state.flash = { driver: 0, custom: 0, A: 0, B: 0 };
}
