/**
 * lanes.js — Sequencer lane management.
 *
 * Each "lane" represents a row of step buttons in the mixer UI:
 *   - master: the master wheel sequence (one step per tooth)
 *   - Aphrase / Bphrase: phrase sequencers for meters A and B
 *   - Awheel / Bwheel: wheel lanes showing equal placements within one cycle
 *
 * Lanes are defined as configuration objects, then built into DOM buttons
 * and wired for interaction (toggle steps, clear all).
 */
import { reduceFraction } from './math.js';

/** Returns a human-readable ratio like "3/4" for the master-to-meter relationship. */
function masterRateLabelForMeter(state, meterValue) {
    return reduceFraction(state.mainTeeth / meterValue, state.mainTeeth);
}

/**
 * Creates the lane configuration objects. Each lane defines:
 *   - container: the DOM element to hold step buttons
 *   - count(): how many steps this lane has
 *   - label(): descriptive text shown above the lane
 *   - textForStep(i): label for each individual step button
 *   - boundary(i): whether step i should have a visual bar-line separator
 */
export function createLanes(ui, state) {
    return {
        master: {
            container: ui.masterGrid,
            clearBtn: ui.clearMasterBtn,
            selected: [],
            className: 'master-btn',
            stepId: 'master-step',
            count: () => state.mainTeeth,
            label: () => `Master Wheel Sequence (${state.mainTeeth} steps / ${state.mainTeeth} teeth • one full cycle)`,
            titleEl: ui.masterTitle,
            textForStep: i => i + 1,
            boundary: i => i % Math.max(1, Math.floor(state.mainTeeth / 4)) === 0
        },
        Aphrase: {
            container: ui.meterAPhraseGrid,
            clearBtn: ui.clearAPhraseBtn,
            selected: [],
            className: 'meterA-btn',
            stepId: 'meterA-phrase-step',
            count: () => state.phraseStepsA,
            label: () => `Meter A Phrase Sequencer (${state.phraseCyclesA} master cycle phrase • ${state.phraseStepsA} steps • clocked at ${masterRateLabelForMeter(state, state.A)} master rate)`,
            titleEl: ui.titleAPhrase,
            textForStep: i => (i % state.A) + 1,
            boundary: i => i % state.A === 0
        },
        Awheel: {
            container: ui.meterAWheelGrid,
            clearBtn: ui.clearAWheelBtn,
            selected: [],
            className: 'meterA-wheel-btn',
            stepId: 'meterA-wheel-step',
            count: () => state.A,
            label: () => `Meter A Wheel Lane (${state.A} equal placements within one master cycle)`,
            titleEl: ui.titleAWheel,
            textForStep: i => i + 1,
            boundary: () => false
        },
        Bphrase: {
            container: ui.meterBPhraseGrid,
            clearBtn: ui.clearBPhraseBtn,
            selected: [],
            className: 'meterB-btn',
            stepId: 'meterB-phrase-step',
            count: () => state.phraseStepsB,
            label: () => `Meter B Phrase Sequencer (${state.phraseCyclesB} master cycle phrase • ${state.phraseStepsB} steps • clocked at ${masterRateLabelForMeter(state, state.B)} master rate)`,
            titleEl: ui.titleBPhrase,
            textForStep: i => (i % state.B) + 1,
            boundary: i => i % state.B === 0
        },
        Bwheel: {
            container: ui.meterBWheelGrid,
            clearBtn: ui.clearBWheelBtn,
            selected: [],
            className: 'meterB-wheel-btn',
            stepId: 'meterB-wheel-step',
            count: () => state.B,
            label: () => `Meter B Wheel Lane (${state.B} equal placements within one master cycle)`,
            titleEl: ui.titleBWheel,
            textForStep: i => i + 1,
            boundary: () => false
        }
    };
}

/**
 * Resets all lane patterns to their defaults:
 *   - Master and phrase lanes start empty
 *   - Wheel lanes start fully active (every step triggers)
 *   - First step of each phrase lane is enabled by default
 */
export function resetPatterns(state, lanes) {
    lanes.master.selected = new Array(state.mainTeeth).fill(false);
    lanes.Aphrase.selected = new Array(state.phraseStepsA).fill(false);
    lanes.Bphrase.selected = new Array(state.phraseStepsB).fill(false);
    lanes.Awheel.selected = new Array(state.A).fill(true);
    lanes.Bwheel.selected = new Array(state.B).fill(true);

    if (lanes.Aphrase.selected.length > 0) lanes.Aphrase.selected[0] = true;
    if (lanes.Bphrase.selected.length > 0) lanes.Bphrase.selected[0] = true;

    state.lastActive = { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 };
}

/** Creates a single step button for a lane with click-to-toggle behavior. */
function createStepButton(lane, i) {
    const btn = document.createElement('button');
    btn.className = `step-btn ${lane.className}`;
    btn.id = `${lane.stepId}-${i}`;
    btn.textContent = lane.textForStep(i);

    if (lane.boundary(i)) btn.classList.add('bar-boundary');
    if (lane.selected[i]) btn.classList.add('active');

    btn.addEventListener('click', () => {
        lane.selected[i] = !lane.selected[i];
        btn.classList.toggle('active', lane.selected[i]);
    });

    return btn;
}

/** Builds all step buttons for a single lane, replacing any existing content. */
export function buildLane(lane) {
    lane.container.innerHTML = '';
    lane.titleEl.textContent = lane.label();
    lane.buttons = [];
    for (let i = 0; i < lane.count(); i++) {
        const btn = createStepButton(lane, i);
        lane.container.appendChild(btn);
        lane.buttons.push(btn);
    }
}

/** Rebuilds every lane's DOM buttons. */
export function buildAllLanes(lanes) {
    Object.values(lanes).forEach(buildLane);
}

/** Attaches click handlers to all lane clear buttons. */
export function wireLaneClearButtons(lanes) {
    Object.values(lanes).forEach((lane) => {
        lane.clearBtn.addEventListener('click', () => {
            lane.selected.fill(false);
            buildLane(lane);
        });
    });
}

/**
 * Highlights the currently active step button across all lanes
 * by adding the "current" class and removing it from all others.
 * Uses cached button references to avoid DOM queries.
 */
export function markCurrentButtons(lanes, active) {
    // Remove "current" class from all cached buttons
    for (const lane of Object.values(lanes)) {
        for (const btn of lane.buttons) {
            btn.classList.remove('current');
        }
    }

    // Add "current" class to the active step in each lane
    const mappings = [
        [lanes.master, active.master],
        [lanes.Aphrase, active.Aphrase],
        [lanes.Bphrase, active.Bphrase],
        [lanes.Awheel, active.Awheel],
        [lanes.Bwheel, active.Bwheel]
    ];

    for (const [lane, index] of mappings) {
        const btn = lane.buttons[index];
        if (btn) btn.classList.add('current');
    }
}
