import { reduceFraction } from './math.js';

function masterRateLabelForMeter(state, meterValue) {
    return reduceFraction(meterValue, state.mainTeeth);
}

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

export function buildLane(lane) {
    lane.container.innerHTML = '';
    lane.titleEl.textContent = lane.label();
    for (let i = 0; i < lane.count(); i++) {
        lane.container.appendChild(createStepButton(lane, i));
    }
}

export function buildAllLanes(lanes) {
    Object.values(lanes).forEach(buildLane);
}

export function wireLaneClearButtons(lanes) {
    Object.values(lanes).forEach((lane) => {
        lane.clearBtn.addEventListener('click', () => {
            lane.selected.fill(false);
            buildLane(lane);
        });
    });
}

function activeStepId(prefix, index) {
    return `${prefix}-${index}`;
}

export function markCurrentButtons(lanes, active) {
    document.querySelectorAll('.step-btn').forEach(btn => btn.classList.remove('current'));

    [
        activeStepId(lanes.master.stepId, active.master),
        activeStepId(lanes.Aphrase.stepId, active.Aphrase),
        activeStepId(lanes.Bphrase.stepId, active.Bphrase),
        activeStepId(lanes.Awheel.stepId, active.Awheel),
        activeStepId(lanes.Bwheel.stepId, active.Bwheel)
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('current');
    });
}
