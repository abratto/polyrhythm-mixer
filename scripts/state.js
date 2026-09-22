/**
 * state.js — Application state management.
 *
 * Holds both user-facing state (meters, phrase lengths, tempo)
 * and derived state (master wheel size, teeth counts, phrase step counts).
 * Derived values are recalculated whenever the user changes A, B, or phrase cycles.
 */
import { lcm } from './math.js';

/**
 * Creates the initial state object from current UI element values.
 * Derived fields (mainTeeth, teethA, etc.) start at zero and are
 * populated by updateDerivedState after creation.
 */
export function createState(ui) {
    return {
        // User-facing meter values (2–24)
        A: parseInt(ui.selectA.value, 10),
        B: parseInt(ui.selectB.value, 10),
        // Number of master cycles the master lane pattern spans
        masterPhraseCycles: parseInt(ui.masterPhraseCycles.value, 10),
        // Legacy timeline phase values are fixed at zero; visible nudging edits rows directly.
        phaseA: 0,
        phaseB: 0,

        // Derived values — computed by updateDerivedState
        mainTeeth: 0,       // LCM(A, B) — total teeth on the master wheel
        teethA: 0,          // mainTeeth / A — teeth on wheel A
        teethB: 0,          // mainTeeth / B — teeth on wheel B
        masterPhraseSteps: 0, // total steps in master phrase (mainTeeth × masterPhraseCycles)
        fullPatternCycles: 0, // LCM of master + grouping lane cycle lengths

        // Animation state
        mainAngle: 0,       // current rotation angle of the master wheel (radians)
        tempo: 90,          // beats per minute (1 beat = 1/4 master cycle)
        audioCtx: null,     // Web Audio API context (created on user gesture)
        audioEnabled: false,
        playing: true,      // transport state — true when the groove is running
        transport: 'playing', // 'stopped' | 'paused' | 'playing' — for status display

        // Audio clock reference for accurate timing (active after first audio enable)
        audioStartTime: 0,
        audioClockActive: false,

        // Scheduler tracking — last step/quarter the audio scheduler has processed
        lastScheduledStep: 0,
        lastScheduledQuarter: 0,
        // Dedup state for the audio scheduler (separate from lastActive used by rAF)
        lastScheduledActive: { master: -1 },

        // Flash counters for visual/audio triggers (count down each frame)
        flash: { driver: 0, custom: 0, A: 0, B: 0 },
        // Tracks the previously active step index per lane to detect transitions.
        // Grouping lanes add a `<cycleKey>: index` entry at runtime.
        lastActive: { master: -1, Awheel: -1, Bwheel: -1 },
        // Which cycle is currently displayed in each multi-cycle lane
        visibleCycle: { master: 0 },
        // Whether each multi-cycle lane auto-follows the playhead (false = pinned/manual)
        followPlayhead: { master: true },
        // Which round visualization renders: 'gears' (mechanical) or 'rings' (clock face)
        vizMode: 'gears'
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

    state.masterPhraseSteps = state.mainTeeth * state.masterPhraseCycles;

    // Grouping-lane cycle lengths are folded in by grouping-lanes.js after this.
    state.fullPatternCycles = state.masterPhraseCycles;
}

/**
 * Keeps legacy phase offsets neutral after meter changes.
 */
export function updatePhaseUI(state) {
    state.phaseA = 0;
    state.phaseB = 0;
}

/** Resets all flash intensity counters to zero. */
export function resetFlashState(state) {
    state.flash = { driver: 0, custom: 0, A: 0, B: 0 };
}
