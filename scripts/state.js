/**
 * state.js — Application state management.
 *
 * Holds both user-facing state (meters, phrase lengths, phase offsets, tempo)
 * and derived state (master wheel size, teeth counts, phrase step counts).
 * Derived values are recalculated whenever the user changes A, B, or phrase cycles.
 */
import { lcm, phraseStepsFor } from './math.js';

/**
 * Creates the initial state object from current UI element values.
 * Derived fields (mainTeeth, teethA, etc.) start at zero and are
 * populated by updateDerivedState after creation.
 */
export function createState(ui) {
    return {
        // User-facing meter values (2–16)
        A: parseInt(ui.selectA.value, 10),
        B: parseInt(ui.selectB.value, 10),
        // Number of master cycles each phrase spans
        phraseCyclesA: parseInt(ui.phraseCyclesA.value, 10),
        phraseCyclesB: parseInt(ui.phraseCyclesB.value, 10),
        // Phase offset in master teeth (shifts the starting position)
        phaseA: parseInt(ui.phaseSliderA.value, 10),
        phaseB: parseInt(ui.phaseSliderB.value, 10),

        // Derived values — computed by updateDerivedState
        mainTeeth: 0,       // LCM(A, B) — total teeth on the master wheel
        teethA: 0,          // mainTeeth / A — teeth on wheel A
        teethB: 0,          // mainTeeth / B — teeth on wheel B
        phraseStepsA: 0,    // total steps in phrase A
        phraseStepsB: 0,    // total steps in phrase B
        fullPatternCycles: 0, // LCM(phraseCyclesA, phraseCyclesB)

        // Animation state
        mainAngle: 0,       // current rotation angle of the master wheel (radians)
        tempo: 90,          // beats per minute (1 beat = 1/4 master cycle)
        audioCtx: null,     // Web Audio API context (created on user gesture)
        audioEnabled: false,

        // Flash counters for visual/audio triggers (count down each frame)
        flash: { driver: 0, custom: 0, A: 0, B: 0 },
        // Tracks the previously active step index per lane to detect transitions
        lastActive: { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 }
    };
}

/**
 * Recalculates all derived state values from the current A, B, and phrase cycle settings.
 * Must be called whenever the user changes meter values or phrase lengths.
 */
export function updateDerivedState(state) {
    state.mainTeeth = lcm(state.A, state.B);
    state.teethA = state.mainTeeth / state.A;
    state.teethB = state.mainTeeth / state.B;

    state.phraseStepsA = phraseStepsFor(state.A, state.phraseCyclesA);
    state.phraseStepsB = phraseStepsFor(state.B, state.phraseCyclesB);

    state.fullPatternCycles = lcm(state.phraseCyclesA, state.phraseCyclesB);
}

/**
 * Updates the phase slider max values and resets the phase offset
 * if it exceeds the new master wheel size after a meter change.
 */
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

/** Resets all flash intensity counters to zero. */
export function resetFlashState(state) {
    state.flash = { driver: 0, custom: 0, A: 0, B: 0 };
}
