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
import { populateInstrumentSelect } from './audio.js';

/**
 * Tracks an in-progress click-drag paint across step buttons. Only one lane
 * can paint at a time (a single global pointer is down). `lane._anchorIndex`
 * remembers the last clicked step so shift-click can select a range.
 */
let _activeDrag = null;
if (typeof window !== 'undefined') {
    window.addEventListener('pointerup', () => { _activeDrag = null; });
}

function setStepValue(arr, i, val, btn) {
    arr[i] = val;
    if (btn) {
        btn.classList.toggle('active', val);
        btn.setAttribute('aria-pressed', String(val));
    }
}

/**
 * Wires click / drag / shift / right-click editing onto a single step button.
 *   - plain click or click-drag: paints a run of steps to the new toggle value
 *   - shift-click: toggles a contiguous range (from the last clicked step)
 *   - right-click: clears that step
 * `isSingle` distinguishes single-voice lanes (state on `lane.selected`) from
 * multi-voice lanes (state on `voice.selected`).
 */
function attachStepHandlers(btn, lane, voice, index, isSingle) {
    const getArr = () => isSingle ? lane.selected : voice.selected;
    const getBtn = (i) => isSingle ? lane.buttons[i] : voice.buttons[i];
    btn.setAttribute('aria-pressed', String(!!getArr()[index]));

    btn.addEventListener('pointerdown', (e) => {
        if (e.button === 2) return; // right-click handled by contextmenu
        e.preventDefault();
        if (e.shiftKey) {
            const anchor = (lane._anchorIndex != null) ? lane._anchorIndex : index;
            const [a, b] = anchor <= index ? [anchor, index] : [index, anchor];
            const arr = getArr();
            for (let i = a; i <= b; i++) setStepValue(arr, i, true, getBtn(i));
            lane._anchorIndex = index;
            return;
        }
        const arr = getArr();
        const val = !arr[index];
        _activeDrag = { lane, value: val, anchorIndex: index };
        lane._anchorIndex = index;
        setStepValue(arr, index, val, btn);
    });

    btn.addEventListener('pointerenter', (e) => {
        if (!_activeDrag || _activeDrag.lane !== lane) return;
        if (e.buttons === 0) { _activeDrag = null; return; }
        setStepValue(getArr(), index, _activeDrag.value, btn);
    });

    btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        setStepValue(getArr(), index, false, btn);
    });
}

/** Returns a human-readable ratio like "3/4" for the master-to-meter relationship. */
function masterRateLabelForMeter(state, meterValue) {
    return reduceFraction(state.mainTeeth / meterValue, state.mainTeeth);
}

/**
 * Beat grouping is anchored to the tool's single global rhythmic reference:
 * the quarter-note grid. One master cycle (mainTeeth ticks) spans 4 quarter
 * notes, so a quarter = mainTeeth/4 ticks. A lane step is a "beat" exactly when
 * that lane's pulse lands on a quarter-note tick.
 *
 * This is musically exact for EVERY meter-A / meter-B pair:
 *   - When mainTeeth is divisible by 4 (one of A/B even, etc.) the grid aligns
 *     to the tick lattice and beats appear at regular intervals.
 *   - When it isn't (e.g. 3:5, 3:7, 5:7) the quarter grid falls between ticks,
 *     so the master lane shows no internal beats — which is the honest result.
 *   - Phrase/wheel lanes show beats only where their pulses coincide with a
 *     quarter, at a period of meter / gcd(meter, 4) steps.
 */

function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a || 1;
}

/** Number of steps between consecutive quarter-note beats for a lane of `n` steps per cycle. */
function quarterBeatPeriod(n) {
    return n / gcd(n, 4);
}

/** True when `tick` (in master-tick units) falls on a quarter-note boundary. */
function isOnQuarter(tick, mainTeeth) {
    const q = mainTeeth / 4;
    if (q === 0) return false;
    const r = ((tick % q) + q) % q;
    return Math.min(r, q - r) < 1e-6;
}

/**
 * Creates a single voice object with empty selected pattern and no DOM refs yet.
 */
function createVoice() {
    return {
        selected: [],
        buttons: [],
        nudgeOffset: 0,
        channel: null // populated by audio.js when voice is added
    };
}

function normalizeNudgeOffset(offset, length) {
    if (!Number.isInteger(length) || length < 2) return 0;
    return ((offset % length) + length) % length;
}

function rotatePatternBy(selected, steps) {
    if (!Array.isArray(selected) || selected.length < 2) return;

    const rightSteps = normalizeNudgeOffset(steps, selected.length);
    if (rightSteps === 0) return;

    selected.unshift(...selected.splice(selected.length - rightSteps, rightSteps));
}

function rotateVoicePattern(voice, direction) {
    rotatePatternBy(voice.selected, direction);
    voice.nudgeOffset = normalizeNudgeOffset((voice.nudgeOffset || 0) + direction, voice.selected.length);
}

function resetVoicePattern(voice) {
    const nudgeOffset = normalizeNudgeOffset(voice.nudgeOffset || 0, voice.selected.length);
    if (nudgeOffset !== 0) {
        rotatePatternBy(voice.selected, -nudgeOffset);
        voice.nudgeOffset = 0;
        return;
    }

    if (!Array.isArray(voice.selected) || voice.selected.length < 2) return;

    const firstActiveIndex = voice.selected.findIndex(Boolean);
    if (firstActiveIndex <= 0) return;

    rotatePatternBy(voice.selected, -firstActiveIndex);
}

function nudgeLaneVoices(lane, direction) {
    lane.voices.forEach(voice => rotateVoicePattern(voice, direction));
}

function resetLaneVoices(lane) {
    lane.voices.forEach(resetVoicePattern);
}

function voiceInstrumentLabel(voice) {
    const soundEl = voice.channel?.soundEl;
    if (soundEl?.selectedOptions?.[0]?.textContent) {
        return soundEl.selectedOptions[0].textContent;
    }

    if (voice.channel?.sound) {
        return voice.channel.sound
            .split('_')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    return 'Instrument';
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
            count: () => state.masterPhraseSteps,
            label: () => 'Master',
            description: () => `${state.masterPhraseSteps} steps / ${state.mainTeeth} teeth × ${state.masterPhraseCycles} ${state.masterPhraseCycles === 1 ? 'cycle' : 'cycles'}`,
            titleEl: ui.masterTitle,
            descriptionEl: ui.masterDescription,
            infoBtn: ui.masterInfoBtn,
            textForStep: i => (i % state.mainTeeth) + 1,
            isBeat: i => isOnQuarter(i % state.mainTeeth, state.mainTeeth),
            isBar: i => (i % state.mainTeeth) === 0,
            beatPeriod: () => quarterBeatPeriod(state.mainTeeth),
            voices: [createVoice()],
            isMultiVoice: true,
            allowVoiceNudge: true,
            allowGroupNudge: true,
            color: '#ff9100',
            channelPrefix: 'master',
            onRemoveVoice: null,
            stepsPerCycle: () => state.mainTeeth,
            totalCycles: () => state.masterPhraseCycles
        },
        Aphrase: {
            container: ui.meterAPhraseGrid,
            headerContainer: ui.meterAPhraseHeaderContainer,
            addVoiceBtn: ui.addAPhraseVoiceBtn,
            clearBtn: ui.clearAPhraseBtn,
            className: 'meterA-btn',
            stepId: 'meterA-phrase-step',
            count: () => state.phraseStepsA,
            label: () => 'Meter A Phrase',
            kind: 'phrase',
            kindHint: 'across cycles',
            description: () => `Phrase (across cycles): ${state.phraseCyclesA} master cycle phrase • ${state.phraseStepsA} steps • clocked at ${masterRateLabelForMeter(state, state.A)} master rate`,
            titleEl: ui.titleAPhrase,
            descriptionEl: ui.aPhraseDescription,
            infoBtn: ui.aPhraseInfoBtn,
            textForStep: i => (i % state.A) + 1,
            isBeat: i => isOnQuarter((i * state.mainTeeth / state.A + state.phaseA) % state.mainTeeth, state.mainTeeth),
            isBar: i => (i % state.A) === 0,
            beatPeriod: () => quarterBeatPeriod(state.A),
            voices: [createVoice()],
            isMultiVoice: true,
            allowVoiceNudge: true,
            allowGroupNudge: true,
            color: '#ff3366',
            channelPrefix: 'A',
            onRemoveVoice: null,
            stepsPerCycle: () => state.A,
            totalCycles: () => state.phraseCyclesA
        },
        Awheel: {
            container: ui.meterAWheelGrid,
            clearBtn: ui.clearAWheelBtn,
            className: 'meterA-wheel-btn',
            stepId: 'meterA-wheel-step',
            count: () => state.A,
            label: () => 'Meter A Pulse',
            kind: 'pulse',
            kindHint: 'per cycle',
            description: () => `Pulse (per cycle): ${state.A} equal placements within one master cycle`,
            titleEl: ui.titleAWheel,
            descriptionEl: ui.aWheelDescription,
            infoBtn: ui.aWheelInfoBtn,
            textForStep: i => i + 1,
            isBeat: i => isOnQuarter((i * state.mainTeeth / state.A + state.phaseA) % state.mainTeeth, state.mainTeeth),
            isBar: i => (i % state.A) === 0,
            beatPeriod: () => quarterBeatPeriod(state.A),
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
            label: () => 'Meter B Phrase',
            kind: 'phrase',
            kindHint: 'across cycles',
            description: () => `Phrase (across cycles): ${state.phraseCyclesB} master cycle phrase • ${state.phraseStepsB} steps • clocked at ${masterRateLabelForMeter(state, state.B)} master rate`,
            titleEl: ui.titleBPhrase,
            descriptionEl: ui.bPhraseDescription,
            infoBtn: ui.bPhraseInfoBtn,
            textForStep: i => (i % state.B) + 1,
            isBeat: i => isOnQuarter((i * state.mainTeeth / state.B + state.phaseB) % state.mainTeeth, state.mainTeeth),
            isBar: i => (i % state.B) === 0,
            beatPeriod: () => quarterBeatPeriod(state.B),
            voices: [createVoice()],
            isMultiVoice: true,
            allowVoiceNudge: true,
            allowGroupNudge: true,
            color: '#00e5ff',
            channelPrefix: 'B',
            onRemoveVoice: null,
            stepsPerCycle: () => state.B,
            totalCycles: () => state.phraseCyclesB
        },
        Bwheel: {
            container: ui.meterBWheelGrid,
            clearBtn: ui.clearBWheelBtn,
            className: 'meterB-wheel-btn',
            stepId: 'meterB-wheel-step',
            count: () => state.B,
            label: () => 'Meter B Pulse',
            kind: 'pulse',
            kindHint: 'per cycle',
            description: () => `Pulse (per cycle): ${state.B} equal placements within one master cycle`,
            titleEl: ui.titleBWheel,
            descriptionEl: ui.bWheelDescription,
            infoBtn: ui.bWheelInfoBtn,
            textForStep: i => i + 1,
            isBeat: i => isOnQuarter((i * state.mainTeeth / state.B + state.phaseB) % state.mainTeeth, state.mainTeeth),
            isBar: i => (i % state.B) === 0,
            beatPeriod: () => quarterBeatPeriod(state.B),
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
    ensureGroupNudgeControl(lane);
    ensureKindHint(lane);
}

/** Renders the always-visible Pulse/Phrase kind hint next to the lane title. */
function ensureKindHint(lane) {
    if (!lane.kindHint || !lane.titleEl) return;
    const group = lane.titleEl.parentElement;
    if (!group) return;
    let hint = group.querySelector('.lane-kind-hint');
    if (!hint) {
        hint = document.createElement('span');
        hint.className = 'lane-kind-hint';
        group.appendChild(hint);
    }
    hint.textContent = lane.kindHint;
    hint.classList.toggle('kind-pulse', lane.kind === 'pulse');
    hint.classList.toggle('kind-phrase', lane.kind === 'phrase');
    if (lane.color) hint.style.color = lane.color;
}

function createNudgeButton(label, title, onClick, className = 'voice-nudge-btn') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', onClick);
    return button;
}

function ensureGroupNudgeControl(lane) {
    if (!lane.allowGroupNudge || !lane.clearBtn || lane.groupNudgeControl) return;

    const nudgeControl = document.createElement('div');
    nudgeControl.className = 'voice-nudge-control group-nudge-control';
    nudgeControl.setAttribute('aria-label', `Nudge all ${lane.label()} voices`);

    const nudgeLabel = document.createElement('span');
    nudgeLabel.className = 'voice-nudge-label';
    nudgeLabel.textContent = 'Nudge Group';

    const nudgeDown = createNudgeButton('←', `Shift all ${lane.label()} voices left`, () => {
        nudgeLaneVoices(lane, -1);
        buildMultiVoiceLane(lane);
    });
    const nudgeReset = createNudgeButton('1', `Reset all ${lane.label()} voices to start on 1`, () => {
        resetLaneVoices(lane);
        buildMultiVoiceLane(lane);
    }, 'voice-nudge-reset-btn');
    const nudgeUp = createNudgeButton('→', `Shift all ${lane.label()} voices right`, () => {
        nudgeLaneVoices(lane, 1);
        buildMultiVoiceLane(lane);
    });

    nudgeControl.append(nudgeLabel, nudgeDown, nudgeReset, nudgeUp);
    lane.clearBtn.before(nudgeControl);
    lane.groupNudgeControl = nudgeControl;
}

/**
 * Resets all lane patterns to their defaults:
 *   - Master and phrase lanes start empty (all voices)
 *   - Wheel lanes start fully active (every step triggers)
 *   - First step of the first master and phrase voices is enabled by default
 */
export function resetPatterns(state, lanes) {
    lanes.master.voices.forEach(v => {
        v.selected = new Array(state.masterPhraseSteps).fill(false);
        v.nudgeOffset = 0;
    });
    lanes.Aphrase.voices.forEach(v => {
        v.selected = new Array(state.phraseStepsA).fill(false);
        v.nudgeOffset = 0;
    });
    lanes.Bphrase.voices.forEach(v => {
        v.selected = new Array(state.phraseStepsB).fill(false);
        v.nudgeOffset = 0;
    });
    lanes.Awheel.selected = new Array(state.A).fill(true);
    lanes.Bwheel.selected = new Array(state.B).fill(true);

    if (lanes.master.voices[0]?.selected.length > 0) lanes.master.voices[0].selected[0] = true;
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
    voice.nudgeOffset = normalizeNudgeOffset(voice.nudgeOffset || 0, newLength);
}

/**
 * Resizes all lanes to match current derived state while preserving patterns.
 * For master voices, copies the first cycle's pattern into each new cycle.
 */
export function resizeAllLanes(state, lanes) {
    lanes.master.voices.forEach(v => {
        resizeVoice(v, state.masterPhraseSteps);
        copyCyclePattern(v, state.mainTeeth);
    });
    lanes.Aphrase.voices.forEach(v => resizeVoice(v, state.phraseStepsA));
    lanes.Bphrase.voices.forEach(v => resizeVoice(v, state.phraseStepsB));
    resizeSingleLane(lanes.Awheel, state.A, true);
    resizeSingleLane(lanes.Bwheel, state.B, true);

    if (lanes.master.voices[0]?.selected.length > 0) lanes.master.voices[0].selected[0] = true;
    if (lanes.Aphrase.voices[0]?.selected.length > 0) lanes.Aphrase.voices[0].selected[0] = true;
    if (lanes.Bphrase.voices[0]?.selected.length > 0) lanes.Bphrase.voices[0].selected[0] = true;
}

/** Copies the first cycle's pattern slice into each subsequent cycle. */
function copyCyclePattern(voice, cycleLength) {
    const total = voice.selected.length;
    if (cycleLength <= 0 || total <= cycleLength) return;
    for (let src = 0; src < cycleLength; src++) {
        for (let dest = src + cycleLength; dest < total; dest += cycleLength) {
            voice.selected[dest] = voice.selected[src];
        }
    }
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
    const voice = createVoice();
    voice.selected = new Array(lane.count()).fill(false);
    lane.voices.push(voice);
}

/** Removes a voice from a multi-voice lane (minimum 1 voice). */
export function removeVoice(lane, index) {
    if (!lane.isMultiVoice || lane.voices.length <= 1) return;
    lane.voices.splice(index, 1);
}

/**
 * Applies beat/bar grouping classes to a step button for visual legibility.
 * A "beat" marks the start of a musical subdivision; a "bar" marks the start
 * of a full meter cycle (stronger divider). Rows alternate shading per beat
 * group so the eye can count groups at a glance.
 */
function applyGroupClasses(btn, lane, i) {
    const isBeat = lane.isBeat?.(i);
    const isBar = lane.isBar?.(i);

    if (isBar && i > 0) {
        btn.classList.add('step-bar');
    } else if (isBeat) {
        btn.classList.add('step-beat');
    }

    const period = lane.beatPeriod?.();
    if (period && period > 0 && Math.floor(i / period) % 2 === 1) {
        btn.classList.add('step-alt');
    }
}

/**
 * Builds an inline instrument <select> for a voice. The select carries the
 * channel's sound id so the existing audio wiring (save/load, scheduling)
 * keeps working, and is recreated on every lane rebuild so it never goes
 * stale. `onChange` updates the bound channel's sound.
 */
function buildVoiceInstrumentSelect(lane, voice, voiceIndex) {
    const id = `sound_${lane.channelPrefix}_${voiceIndex}`;
    const select = document.createElement('select');
    select.id = id;
    select.className = 'voice-instrument-select';
    select.style.color = lane.color;
    populateInstrumentSelect(select, voice.channel?.sound);
    select.addEventListener('change', () => {
        if (!voice.channel) return;
        voice.channel.sound = select.value;
        voice.channel.onInstrumentChange?.();
    });
    if (voice.channel) voice.channel.soundEl = select;
    return select;
}

/** Creates a single step button for a voice with click-to-toggle behavior. */
function createStepButton(lane, voice, i, actualIndex) {
    actualIndex = actualIndex ?? i;
    const btn = document.createElement('button');
    btn.className = `step-btn ${lane.className}`;
    btn.id = `${lane.stepId}-${i}`;
    btn.textContent = lane.textForStep(i);

    applyGroupClasses(btn, lane, i);
    if (voice.selected[actualIndex]) btn.classList.add('active');

    attachStepHandlers(btn, lane, voice, actualIndex, false);

    return btn;
}

/** Builds all step buttons for a single voice, replacing any existing content. */
function buildVoiceButtons(lane, voice, voiceIndex, state) {
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
            buildMultiVoiceLane(lane, state);
        });
        labelArea.appendChild(removeBtn);
    }

    if (lane.allowVoiceNudge) {
        const nudgeControl = document.createElement('div');
        nudgeControl.className = 'voice-nudge-control';
        nudgeControl.setAttribute('aria-label', `Nudge Voice ${voiceIndex + 1}`);

        const nudgeLabel = document.createElement('span');
        nudgeLabel.className = 'voice-nudge-label';
        nudgeLabel.textContent = 'Nudge';

        const nudgeDown = createNudgeButton('←', `Shift Voice ${voiceIndex + 1} left`, () => {
            rotateVoicePattern(voice, -1);
            buildMultiVoiceLane(lane, state);
        });
        const nudgeReset = createNudgeButton('1', `Reset Voice ${voiceIndex + 1} to start on 1`, () => {
            resetVoicePattern(voice);
            buildMultiVoiceLane(lane, state);
        }, 'voice-nudge-reset-btn');
        const nudgeUp = createNudgeButton('→', `Shift Voice ${voiceIndex + 1} right`, () => {
            rotateVoicePattern(voice, 1);
            buildMultiVoiceLane(lane, state);
        });

        nudgeControl.append(nudgeLabel, nudgeDown, nudgeReset, nudgeUp);
        labelArea.appendChild(nudgeControl);
    }

    // Per-voice Copy/Paste (single-voice granularity) inside each multi-voice row
    labelArea.appendChild(createVoiceEditControls(lane, voiceIndex));

    row.appendChild(labelArea);

    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column';

    const instrumentSelect = buildVoiceInstrumentSelect(lane, voice, voiceIndex);
    instrumentSelect.title = `Voice ${voiceIndex + 1} instrument`;
    stepsColumn.appendChild(instrumentSelect);

    // Step buttons container
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'voice-steps';
    stepsContainer.style.position = 'relative';

    const totalCycles = lane.totalCycles?.() ?? 1;
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    const visibleCycle = totalCycles > 1 ? (lane._visibleCycle ?? 0) : 0;
    const cycleStart = visibleCycle * stepsPerCycle;

    voice.buttons = [];
    for (let i = 0; i < stepsPerCycle; i++) {
        const actualIndex = totalCycles > 1 ? cycleStart + i : i;
        const btn = createStepButton(lane, voice, i, actualIndex);
        stepsContainer.appendChild(btn);
        voice.buttons.push(btn);
    }

    // Per-voice playhead column overlay (spans this voice's step row).
    const playhead = document.createElement('div');
    playhead.className = 'lane-playhead';
    playhead.setAttribute('aria-hidden', 'true');
    stepsContainer.appendChild(playhead);
    lane._playheads = lane._playheads || [];
    lane._playheads.push(playhead);

    stepsColumn.appendChild(stepsContainer);
    row.appendChild(stepsColumn);

    return row;
}

/** Refreshes displayed instrument selections without rebuilding step buttons. */
export function updateVoiceInstrumentLabels(lane) {
    if (!lane.isMultiVoice || !lane.container) return;

    lane.voices.forEach((voice, idx) => {
        const row = lane.container.querySelector(`.voice-row[data-voice-index="${idx}"]`);
        const select = row?.querySelector('.voice-instrument-select');
        if (!select) return;

        if (voice.channel?.sound) select.value = voice.channel.sound;
    });
}

function cycleNavKey(lane) {
    if (lane.stepId.includes('meterA')) return 'Aphrase';
    if (lane.stepId.includes('meterB')) return 'Bphrase';
    return 'master';
}

function addCycleNavigation(lane, state) {
    const totalCycles = lane.totalCycles();
    const key = cycleNavKey(lane);
    const current = state.visibleCycle[key];
    const following = state.followPlayhead[key] !== false;

    const viewActions = lane.container?.closest('.matrix-row')?.querySelector('.lane-view-actions');
    if (!viewActions) return;

    const existing = viewActions.querySelector('.cycle-nav');
    if (existing) existing.remove();

    const nav = document.createElement('div');
    nav.className = 'cycle-nav';

    const title = document.createElement('span');
    title.className = 'cycle-nav-title';
    title.textContent = 'Cycle';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'cycle-nav-btn';
    prevBtn.textContent = '\u25c0';
    prevBtn.title = 'Previous cycle';
    prevBtn.addEventListener('click', () => {
        state.followPlayhead[key] = false;
        state.visibleCycle[key] = ((state.visibleCycle[key] || 0) - 1 + totalCycles) % totalCycles;
        buildMultiVoiceLane(lane, state);
    });

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'cycle-nav-label';
    if (!following) label.classList.add('pinned');
    label.textContent = following
        ? `AUTO ${current + 1}/${totalCycles}`
        : `PIN ${current + 1}/${totalCycles}`;
    label.title = following ? 'Following playhead — click to pin' : 'Pinned — click to follow playhead';
    label.addEventListener('click', () => {
        state.followPlayhead[key] = !state.followPlayhead[key];
        buildMultiVoiceLane(lane, state);
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'cycle-nav-btn';
    nextBtn.textContent = '\u25b6';
    nextBtn.title = 'Next cycle';
    nextBtn.addEventListener('click', () => {
        state.followPlayhead[key] = false;
        state.visibleCycle[key] = ((state.visibleCycle[key] || 0) + 1) % totalCycles;
        buildMultiVoiceLane(lane, state);
    });

    nav.append(title, prevBtn, label, nextBtn);
    viewActions.appendChild(nav);
}

/** Builds all voice rows for a multi-voice lane. */
function buildMultiVoiceLane(lane, state) {
    lane.container.innerHTML = '';
    lane.container.style.position = 'relative';
    lane._playheads = [];
    updateLaneHeader(lane);

    const totalCycles = lane.totalCycles?.() ?? 1;
    if (totalCycles > 1 && state) {
        addCycleNavigation(lane, state);
    }

    if (state) {
        const laneKey = lane.stepId.includes('meterA') ? 'Aphrase'
            : lane.stepId.includes('meterB') ? 'Bphrase' : 'master';
        lane._visibleCycle = state?.visibleCycle?.[laneKey] ?? 0;
    }

    lane.voices.forEach((voice, idx) => {
        const row = buildVoiceButtons(lane, voice, idx, state);
        lane.container.appendChild(row);
    });

    // "Playhead is in another cycle" cue (shown when this lane is PINned away
    // from the cycle currently playing).
    const cue = document.createElement('div');
    cue.className = 'lane-cycle-cue';
    cue.hidden = true;
    lane.container.appendChild(cue);
    lane._cue = cue;

    applyLaneMixState(lane);
}

/** Builds a single-voice lane. */
function buildSingleLane(lane) {
    lane.container.innerHTML = '';
    updateLaneHeader(lane);
    lane.container.style.position = 'relative';
    lane.buttons = [];
    for (let i = 0; i < lane.count(); i++) {
        const btn = createStepButtonForSingle(lane, i);
        lane.container.appendChild(btn);
        lane.buttons.push(btn);
    }
    const playhead = document.createElement('div');
    playhead.className = 'lane-playhead lane-playhead-single';
    playhead.setAttribute('aria-hidden', 'true');
    lane.container.appendChild(playhead);
    lane._playhead = playhead;
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

    applyGroupClasses(btn, lane, i);
    if (lane.selected[i]) btn.classList.add('active');

    attachStepHandlers(btn, lane, null, i, true);

    return btn;
}

/** Builds all step buttons for a lane, replacing any existing content. */
export function buildLane(lane, state) {
    if (lane.isMultiVoice) {
        buildMultiVoiceLane(lane, state);
    } else {
        buildSingleLane(lane);
    }
    applyLaneMixState(lane);
}

/**
 * Dim/suppress a lane (or individual voice rows) when its mixer channel is
 * muted or when another channel is soloed. Driven by `channel.silenced`,
 * which `audio.js` recomputes via `refreshSilenced()` on every mix change.
 */
function setVoiceRowDim(lane, voiceIndex, dim) {
    const row = lane.container?.querySelector(`.voice-row[data-voice-index="${voiceIndex}"]`);
    if (row) row.classList.toggle('lane-muted', dim);
}

function reflectLaneMix(lane) {
    if (!lane.isMultiVoice) return;
    lane.voices.forEach((voice, i) => {
        setVoiceRowDim(lane, i, !!voice.channel?.silenced);
    });
}

function reflectLaneMixSingle(lane) {
    const silenced = lane.channel?.silenced;
    if (lane.container) lane.container.classList.toggle('lane-muted', !!silenced);
}

function applyLaneMixState(lane) {
    if (lane.isMultiVoice) reflectLaneMix(lane);
    else reflectLaneMixSingle(lane);
}

/** Re-applies mix-driven dimming across every lane. Called by `onMixChange`. */
export function applyMixVisuals(lanes) {
    reflectLaneMix(lanes.master);
    reflectLaneMix(lanes.Aphrase);
    reflectLaneMix(lanes.Bphrase);
    reflectLaneMixSingle(lanes.Awheel);
    reflectLaneMixSingle(lanes.Bwheel);
}

/** Rebuilds every lane's DOM buttons. */
export function buildAllLanes(lanes, state) {
    Object.values(lanes).forEach(lane => buildLane(lane, state));
}

function removeCurrentClass(button) {
    if (button) button.classList.remove('current');
}

function addCurrentClass(button) {
    if (button) button.classList.add('current');
}

/** Attaches click handlers to all lane clear buttons. */
export function wireLaneClearButtons(lanes) {
    Object.values(lanes).forEach((lane) => {
        if (lane.clearBtn) {
            lane.clearBtn.addEventListener('click', () => {
                if (lane.isMultiVoice) {
                    lane.voices.forEach(v => {
                        v.selected.fill(false);
                        v.nudgeOffset = 0;
                    });
                } else {
                    lane.selected.fill(false);
                }
                buildLane(lane);
            });
        }
    });
}

/** Replaces a lane's pattern with a random one (~40% density). */
function randomizeLane(lane) {
    if (lane.isMultiVoice) {
        lane.voices.forEach(v => {
            for (let i = 0; i < v.selected.length; i++) v.selected[i] = Math.random() < 0.4;
        });
    } else {
        for (let i = 0; i < lane.selected.length; i++) lane.selected[i] = Math.random() < 0.4;
    }
    buildLane(lane);
}

/** Reverses every voice's pattern in place. */
function reverseLane(lane) {
    if (lane.isMultiVoice) lane.voices.forEach(v => v.selected.reverse());
    else lane.selected.reverse();
    buildLane(lane);
}

let _laneClipboard = null;

/** Captures the lane's current pattern for later paste. */
function copyLane(lane) {
    if (lane.isMultiVoice) {
        _laneClipboard = { multi: true, voices: lane.voices.map(v => [...v.selected]) };
    } else {
        _laneClipboard = { multi: false, selected: [...lane.selected] };
    }
}

/** Pastes a previously copied pattern into the lane (voice/step counts must match). */
function pasteLane(lane) {
    if (!_laneClipboard) return;
    if (_laneClipboard.multi && lane.isMultiVoice) {
        const n = Math.min(_laneClipboard.voices.length, lane.voices.length);
        for (let vi = 0; vi < n; vi++) {
            const src = _laneClipboard.voices[vi];
            const dst = lane.voices[vi].selected;
            const len = Math.min(src.length, dst.length);
            for (let i = 0; i < len; i++) dst[i] = src[i];
        }
    } else if (!_laneClipboard.multi && !lane.isMultiVoice) {
        const src = _laneClipboard.selected;
        const dst = lane.selected;
        const len = Math.min(src.length, dst.length);
        for (let i = 0; i < len; i++) dst[i] = src[i];
    }
    buildLane(lane);
}

/** Single-voice clipboard for per-voice copy/paste. */
let _voiceClipboard = null;

function copyVoice(voice) {
    _voiceClipboard = [...voice.selected];
}

function pasteVoice(lane, voice) {
    if (!_voiceClipboard) return;
    const dst = voice.selected;
    const len = Math.min(_voiceClipboard.length, dst.length);
    for (let i = 0; i < len; i++) dst[i] = _voiceClipboard[i];
    buildLane(lane);
}

/**
 * Builds the per-voice Copy/Paste controls shown inside each multi-voice row,
 * so a single voice can be copied and pasted into another voice (same lane or
 * a different lane).
 */
function createVoiceEditControls(lane, voiceIndex) {
    const group = document.createElement('div');
    group.className = 'voice-edit-controls';
    const mk = (label, title, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'edit-btn edit-btn-sm';
        b.textContent = label;
        b.title = title;
        b.addEventListener('click', fn);
        return b;
    };
    group.append(
        mk('Copy', `Copy voice ${voiceIndex + 1}`, () => copyVoice(lane.voices[voiceIndex])),
        mk('Paste', `Paste into voice ${voiceIndex + 1}`, () => pasteVoice(lane, lane.voices[voiceIndex]))
    );
    return group;
}

/**
 * Adds per-lane editing buttons (Randomize / Reverse / Copy / Paste) to the
 * lane toolbar. Called once per lane during initialization.
 */
export function addLaneEditControls(lane) {
    if (!lane.clearBtn) return;
    const parent = lane.clearBtn.parentElement;
    if (!parent || parent.querySelector('.lane-edit-controls')) return;

    const mkBtn = (label, title, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'edit-btn';
        b.textContent = label;
        b.title = title;
        b.addEventListener('click', fn);
        return b;
    };

    const group = document.createElement('div');
    group.className = 'lane-edit-controls';
    group.setAttribute('aria-label', `Edit ${lane.label()} pattern`);
    const name = lane.label();
    group.append(
        mkBtn('Random', `Randomize ${name}`, () => randomizeLane(lane)),
        mkBtn('Reverse', `Reverse ${name}`, () => reverseLane(lane)),
        mkBtn('Copy Lane', `Copy entire ${name} (all voices)`, () => copyLane(lane)),
        mkBtn('Paste Lane', `Paste into entire ${name} (all voices)`, () => pasteLane(lane))
    );
    parent.appendChild(group);
}

/** Moves a lane's playhead column overlay to the given visible step index. */
function positionPlayhead(overlay, displayedIndex, stepsPerCycle) {
    if (!overlay) return;
    if (displayedIndex < 0 || displayedIndex >= stepsPerCycle) {
        overlay.style.opacity = '0';
        return;
    }
    overlay.style.opacity = '1';
    overlay.style.left = (displayedIndex / stepsPerCycle) * 100 + '%';
    overlay.style.width = (1 / stepsPerCycle) * 100 + '%';
}

function markMultiVoiceCurrentButtons(lane, state, previous, next) {
    const currentIndexes = Array.isArray(next) ? next : lane.voices.map(() => next);
    const totalCycles = lane.totalCycles?.() ?? 1;
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();

    if (lane._playheads) lane._playheads.forEach(p => { if (p) p.style.opacity = '0'; });

    if (totalCycles > 1) {
        const laneKey = cycleNavKey(lane);
        const following = state?.followPlayhead?.[laneKey] !== false;
        const visibleCycle = state?.visibleCycle?.[laneKey] ?? 0;
        const cycleStart = visibleCycle * stepsPerCycle;

        lane.voices.forEach((voice) => {
            voice.buttons.forEach(btn => btn?.classList.remove('current'));
        });

        if (following) {
            lane.voices.forEach((voice, voiceIndex) => {
                const displayedCurr = currentIndexes[voiceIndex] - cycleStart;
                if (displayedCurr >= 0 && displayedCurr < stepsPerCycle) {
                    addCurrentClass(voice.buttons[displayedCurr]);
                    positionPlayhead(lane._playheads?.[voiceIndex], displayedCurr, stepsPerCycle);
                }
            });
            if (lane._cue) lane._cue.hidden = true;
        } else {
            // Pinned: only highlight if the active step lives in the visible cycle.
            lane.voices.forEach((voice, voiceIndex) => {
                const activeInVisible = currentIndexes[voiceIndex] - cycleStart;
                if (activeInVisible >= 0 && activeInVisible < stepsPerCycle) {
                    addCurrentClass(voice.buttons[activeInVisible]);
                    positionPlayhead(lane._playheads?.[voiceIndex], activeInVisible, stepsPerCycle);
                }
            });
            const anyElsewhere = lane.voices.some((_, vi) => Math.floor(currentIndexes[vi] / stepsPerCycle) !== visibleCycle);
            if (lane._cue) {
                if (anyElsewhere) {
                    const activeCycle = Math.floor(currentIndexes[0] / stepsPerCycle);
                    lane._cue.textContent = `▶ playhead in cycle ${activeCycle + 1}`;
                    lane._cue.hidden = false;
                } else {
                    lane._cue.hidden = true;
                }
            }
        }
    } else {
        const previousIndexes = Array.isArray(previous) ? previous : lane.voices.map(() => previous);

        lane.voices.forEach((voice, voiceIndex) => {
            removeCurrentClass(voice.buttons[previousIndexes[voiceIndex]]);
            addCurrentClass(voice.buttons[currentIndexes[voiceIndex]]);
            positionPlayhead(lane._playheads?.[voiceIndex], currentIndexes[voiceIndex], stepsPerCycle);
        });
        if (lane._cue) lane._cue.hidden = true;
    }
}

function markSingleVoiceCurrentButtons(lane, previous, next) {
    removeCurrentClass(lane.buttons[previous]);
    addCurrentClass(lane.buttons[next]);
    positionPlayhead(lane._playhead, next, lane.count());
}

/**
 * Highlights the currently active step button across all lanes.
 * For multi-voice lanes, highlights the active step in each voice.
 * Tracks previous button indices to avoid O(N) iteration.
 */
export function markCurrentButtons(state, lanes, active, previousActive = null) {
    const mappings = [
        ['master', lanes.master, active.master],
        ['Aphrase', lanes.Aphrase, active.Aphrase],
        ['Bphrase', lanes.Bphrase, active.Bphrase],
        ['Awheel', lanes.Awheel, active.Awheel],
        ['Bwheel', lanes.Bwheel, active.Bwheel]
    ];

    const prev = previousActive || state.lastActive;

    for (const [key, lane, index] of mappings) {
        if (lane.isMultiVoice) {
            markMultiVoiceCurrentButtons(lane, state, prev[key], index);
        } else {
            markSingleVoiceCurrentButtons(lane, prev[key], index);
        }
    }
}
