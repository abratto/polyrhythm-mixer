/**
 * lanes.js — Sequencer lane management with multi-voice support.
 *
 * Each "lane group" represents a row of step buttons in the mixer UI:
 *   - master: the master wheel sequence (one step per tooth)
 *   - Aphrase / Bphrase: phrase sequencers for meters A and B
 *   - Awheel / Bwheel: wheel lanes showing equal placements within one cycle
 *
 * Master, Aphrase, and Bphrase support multiple independent voices.
 * Each voice has its own selected[] pattern, DOM buttons, and audio channel.
 * Awheel and Bwheel remain single-voice (no pattern to layer).
 */
import { reduceFraction } from './math.js';

/** Returns a human-readable ratio like "3/4" for the master-to-meter relationship. */
function masterRateLabelForMeter(state, meterValue) {
    return reduceFraction(state.mainTeeth / meterValue, state.mainTeeth);
}

/**
 * Creates a single voice object with empty selected pattern and no DOM refs yet.
 */
function createVoice() {
    return {
        selected: [],
        buttons: [],
        channel: null // populated by audio.js when voice is added
    };
}

/**
 * Creates the lane configuration objects. Multi-voice lanes (master, Aphrase, Bphrase)
 * have a `voices` array. Single-voice lanes (Awheel, Bwheel) have a flat structure.
 */
export function createLanes(ui, state) {
    return {
        master: {
            container: ui.masterGrid,
            headerContainer: ui.masterHeaderContainer,
            addVoiceBtn: ui.addMasterVoiceBtn,
            clearBtn: ui.clearMasterBtn,
            className: 'master-btn',
            stepId: 'master-step',
            count: () => state.mainTeeth,
            label: () => 'Master Cycle Pattern',
            description: () => `${state.mainTeeth} steps / ${state.mainTeeth} teeth • one full cycle`,
            titleEl: ui.masterTitle,
            descriptionEl: ui.masterDescription,
            infoBtn: ui.masterInfoBtn,
            textForStep: i => i + 1,
            boundary: i => i % Math.max(1, Math.floor(state.mainTeeth / 4)) === 0,
            voices: [createVoice()],
            isMultiVoice: true,
            color: '#ff9100',
            channelPrefix: 'master',
            onRemoveVoice: null
        },
        Aphrase: {
            container: ui.meterAPhraseGrid,
            headerContainer: ui.meterAPhraseHeaderContainer,
            addVoiceBtn: ui.addAPhraseVoiceBtn,
            clearBtn: ui.clearAPhraseBtn,
            className: 'meterA-btn',
            stepId: 'meterA-phrase-step',
            count: () => state.phraseStepsA,
            label: () => 'Meter A Phrase Pattern',
            description: () => `${state.phraseCyclesA} master cycle phrase • ${state.phraseStepsA} steps • clocked at ${masterRateLabelForMeter(state, state.A)} master rate`,
            titleEl: ui.titleAPhrase,
            descriptionEl: ui.aPhraseDescription,
            infoBtn: ui.aPhraseInfoBtn,
            textForStep: i => (i % state.A) + 1,
            boundary: i => i % state.A === 0,
            voices: [createVoice()],
            isMultiVoice: true,
            color: '#ff3366',
            channelPrefix: 'A',
            onRemoveVoice: null
        },
        Awheel: {
            container: ui.meterAWheelGrid,
            clearBtn: ui.clearAWheelBtn,
            className: 'meterA-wheel-btn',
            stepId: 'meterA-wheel-step',
            count: () => state.A,
            label: () => 'Meter A Cycle Pattern',
            description: () => `${state.A} equal placements within one master cycle`,
            titleEl: ui.titleAWheel,
            descriptionEl: ui.aWheelDescription,
            infoBtn: ui.aWheelInfoBtn,
            textForStep: i => i + 1,
            boundary: () => false,
            selected: [],
            buttons: [],
            isMultiVoice: false,
            color: '#ff6b8f',
            channelPrefix: 'Awheel'
        },
        Bphrase: {
            container: ui.meterBPhraseGrid,
            headerContainer: ui.meterBPhraseHeaderContainer,
            addVoiceBtn: ui.addBPhraseVoiceBtn,
            clearBtn: ui.clearBPhraseBtn,
            className: 'meterB-btn',
            stepId: 'meterB-phrase-step',
            count: () => state.phraseStepsB,
            label: () => 'Meter B Phrase Pattern',
            description: () => `${state.phraseCyclesB} master cycle phrase • ${state.phraseStepsB} steps • clocked at ${masterRateLabelForMeter(state, state.B)} master rate`,
            titleEl: ui.titleBPhrase,
            descriptionEl: ui.bPhraseDescription,
            infoBtn: ui.bPhraseInfoBtn,
            textForStep: i => (i % state.B) + 1,
            boundary: i => i % state.B === 0,
            voices: [createVoice()],
            isMultiVoice: true,
            color: '#00e5ff',
            channelPrefix: 'B',
            onRemoveVoice: null
        },
        Bwheel: {
            container: ui.meterBWheelGrid,
            clearBtn: ui.clearBWheelBtn,
            className: 'meterB-wheel-btn',
            stepId: 'meterB-wheel-step',
            count: () => state.B,
            label: () => 'Meter B Cycle Pattern',
            description: () => `${state.B} equal placements within one master cycle`,
            titleEl: ui.titleBWheel,
            descriptionEl: ui.bWheelDescription,
            infoBtn: ui.bWheelInfoBtn,
            textForStep: i => i + 1,
            boundary: () => false,
            selected: [],
            buttons: [],
            isMultiVoice: false,
            color: '#6ef2ff',
            channelPrefix: 'Bwheel'
        }
    };
}

function updateLaneHeader(lane) {
    lane.titleEl.textContent = lane.label();
    if (lane.descriptionEl && lane.description) {
        lane.descriptionEl.textContent = lane.description();
    }
}

/**
 * Resets all lane patterns to their defaults:
 *   - Master and phrase lanes start empty (all voices)
 *   - Wheel lanes start fully active (every step triggers)
 *   - First step of each phrase lane is enabled by default
 */
export function resetPatterns(state, lanes) {
    lanes.master.voices.forEach(v => {
        v.selected = new Array(state.mainTeeth).fill(false);
    });
    lanes.Aphrase.voices.forEach(v => {
        v.selected = new Array(state.phraseStepsA).fill(false);
    });
    lanes.Bphrase.voices.forEach(v => {
        v.selected = new Array(state.phraseStepsB).fill(false);
    });
    lanes.Awheel.selected = new Array(state.A).fill(true);
    lanes.Bwheel.selected = new Array(state.B).fill(true);

    if (lanes.Aphrase.voices[0]?.selected.length > 0) lanes.Aphrase.voices[0].selected[0] = true;
    if (lanes.Bphrase.voices[0]?.selected.length > 0) lanes.Bphrase.voices[0].selected[0] = true;

    state.lastActive = { master: -1, Aphrase: -1, Awheel: -1, Bphrase: -1, Bwheel: -1 };
}

/**
 * Resizes a voice's selected array while preserving existing pattern data.
 * If growing, new slots are empty (false). If shrinking, excess is truncated.
 */
function resizeVoice(voice, newLength) {
    const old = voice.selected;
    const resized = new Array(newLength).fill(false);
    const copyCount = Math.min(old.length, newLength);
    for (let i = 0; i < copyCount; i++) {
        resized[i] = old[i];
    }
    voice.selected = resized;
}

/**
 * Resizes all lanes to match current derived state while preserving patterns.
 */
export function resizeAllLanes(state, lanes) {
    lanes.master.voices.forEach(v => resizeVoice(v, state.mainTeeth));
    lanes.Aphrase.voices.forEach(v => resizeVoice(v, state.phraseStepsA));
    lanes.Bphrase.voices.forEach(v => resizeVoice(v, state.phraseStepsB));
    resizeSingleLane(lanes.Awheel, state.A, true);
    resizeSingleLane(lanes.Bwheel, state.B, true);

    if (lanes.Aphrase.voices[0]?.selected.length > 0) lanes.Aphrase.voices[0].selected[0] = true;
    if (lanes.Bphrase.voices[0]?.selected.length > 0) lanes.Bphrase.voices[0].selected[0] = true;
}

/** Resizes a single-voice lane (wheel lanes). */
function resizeSingleLane(lane, newLength, isWheel = false) {
    const old = lane.selected;
    const resized = new Array(newLength).fill(isWheel);
    const copyCount = Math.min(old.length, newLength);
    for (let i = 0; i < copyCount; i++) {
        resized[i] = old[i];
    }
    lane.selected = resized;
}

/** Adds a new voice to a multi-voice lane. */
export function addVoice(lane) {
    if (!lane.isMultiVoice) return;
    lane.voices.push(createVoice());
}

/** Removes a voice from a multi-voice lane (minimum 1 voice). */
export function removeVoice(lane, index) {
    if (!lane.isMultiVoice || lane.voices.length <= 1) return;
    lane.voices.splice(index, 1);
}

/** Creates a single step button for a voice with click-to-toggle behavior. */
function createStepButton(lane, voice, i) {
    const btn = document.createElement('button');
    btn.className = `step-btn ${lane.className}`;
    btn.id = `${lane.stepId}-${i}`;
    btn.textContent = lane.textForStep(i);

    if (lane.boundary(i)) btn.classList.add('bar-boundary');
    if (voice.selected[i]) btn.classList.add('active');

    btn.addEventListener('click', () => {
        voice.selected[i] = !voice.selected[i];
        btn.classList.toggle('active', voice.selected[i]);
    });

    return btn;
}

/** Builds all step buttons for a single voice, replacing any existing content. */
function buildVoiceButtons(lane, voice, voiceIndex) {
    const row = document.createElement('div');
    row.className = 'voice-row';
    row.dataset.voiceIndex = voiceIndex;

    // Voice label area (fixed width to prevent shifting)
    const labelArea = document.createElement('div');
    labelArea.className = 'voice-label-area';

    const label = document.createElement('span');
    label.className = 'voice-label';
    label.textContent = `Voice ${voiceIndex + 1}`;
    label.style.color = lane.color;
    labelArea.appendChild(label);

    // Remove button (not for first voice)
    if (voiceIndex > 0) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-voice-btn';
        removeBtn.textContent = '×';
        removeBtn.title = `Remove Voice ${voiceIndex + 1}`;
        removeBtn.addEventListener('click', () => {
            removeVoice(lane, voiceIndex);
            if (lane.onRemoveVoice) {
                lane.onRemoveVoice(voiceIndex);
            }
            buildMultiVoiceLane(lane);
        });
        labelArea.appendChild(removeBtn);
    }

    row.appendChild(labelArea);

    // Step buttons container
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'voice-steps';
    voice.buttons = [];
    for (let i = 0; i < lane.count(); i++) {
        const btn = createStepButton(lane, voice, i);
        stepsContainer.appendChild(btn);
        voice.buttons.push(btn);
    }
    row.appendChild(stepsContainer);

    return row;
}

/** Builds all voice rows for a multi-voice lane. */
function buildMultiVoiceLane(lane) {
    lane.container.innerHTML = '';
    updateLaneHeader(lane);
    lane.voices.forEach((voice, idx) => {
        const row = buildVoiceButtons(lane, voice, idx);
        lane.container.appendChild(row);
    });
}

/** Builds a single-voice lane. */
function buildSingleLane(lane) {
    lane.container.innerHTML = '';
    updateLaneHeader(lane);
    lane.buttons = [];
    for (let i = 0; i < lane.count(); i++) {
        const btn = createStepButtonForSingle(lane, i);
        lane.container.appendChild(btn);
        lane.buttons.push(btn);
    }
}

/** Attaches click handlers to each lane's inline explanation toggle. */
export function wireLaneInfoButtons(lanes) {
    Object.values(lanes).forEach((lane) => {
        if (!lane.infoBtn || !lane.descriptionEl) return;

        lane.infoBtn.addEventListener('click', () => {
            const shouldShow = lane.descriptionEl.hidden;
            lane.descriptionEl.hidden = !shouldShow;
            lane.infoBtn.setAttribute('aria-expanded', String(shouldShow));
        });
    });
}

/** Creates a step button for a single-voice lane. */
function createStepButtonForSingle(lane, i) {
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

/** Builds all step buttons for a lane, replacing any existing content. */
export function buildLane(lane) {
    if (lane.isMultiVoice) {
        buildMultiVoiceLane(lane);
    } else {
        buildSingleLane(lane);
    }
}

/** Rebuilds every lane's DOM buttons. */
export function buildAllLanes(lanes) {
    Object.values(lanes).forEach(buildLane);
}

/** Attaches click handlers to all lane clear buttons. */
export function wireLaneClearButtons(lanes) {
    Object.values(lanes).forEach((lane) => {
        if (lane.clearBtn) {
            lane.clearBtn.addEventListener('click', () => {
                if (lane.isMultiVoice) {
                    lane.voices.forEach(v => v.selected.fill(false));
                } else {
                    lane.selected.fill(false);
                }
                buildLane(lane);
            });
        }
    });
}

/**
 * Highlights the currently active step button across all lanes.
 * For multi-voice lanes, highlights the active step in each voice.
 * Tracks previous button indices to avoid O(N) iteration.
 */
export function markCurrentButtons(state, lanes, active) {
    const mappings = [
        ['master', lanes.master, active.master],
        ['Aphrase', lanes.Aphrase, active.Aphrase],
        ['Bphrase', lanes.Bphrase, active.Bphrase],
        ['Awheel', lanes.Awheel, active.Awheel],
        ['Bwheel', lanes.Bwheel, active.Bwheel]
    ];

    for (const [key, lane, index] of mappings) {
        const prev = state.lastActive[key];
        if (lane.isMultiVoice) {
            // Remove from previous voice buttons
            if (prev >= 0) {
                for (const voice of lane.voices) {
                    const prevBtn = voice.buttons[prev];
                    if (prevBtn) prevBtn.classList.remove('current');
                }
            }
            // Add to current voice buttons
            for (const voice of lane.voices) {
                const btn = voice.buttons[index];
                if (btn) btn.classList.add('current');
            }
        } else {
            // Remove from previous button
            if (prev >= 0) {
                const prevBtn = lane.buttons[prev];
                if (prevBtn) prevBtn.classList.remove('current');
            }
            // Add to current button
            const btn = lane.buttons[index];
            if (btn) btn.classList.add('current');
        }
    }
}
