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
import { gcd, reduceFraction } from './math.js';
import { populateInstrumentSelect, bindSoloMute } from './audio.js';

/**
 * Tracks an in-progress click-drag paint across step buttons. Only one lane
 * can paint at a time (a single global pointer is down). `lane._anchorIndex`
 * remembers the last clicked step so shift-click can select a range.
 */
let _activeDrag = null;
if (typeof window !== 'undefined') {
    window.addEventListener('pointerup', () => { _activeDrag = null; });
}

// Holds the live channels object so lane-rendered Solo/Mute controls can wire
// themselves to the audio engine. Set once at startup via setMixChannels.
let _mixChannels = null;
export function setMixChannels(channels) {
    _mixChannels = channels;
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

    btn.onpointerdown = (e) => {
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
    };

    btn.onpointerenter = (e) => {
        if (!_activeDrag || _activeDrag.lane !== lane) return;
        if (e.buttons === 0) { _activeDrag = null; return; }
        setStepValue(getArr(), index, _activeDrag.value, btn);
    };

    btn.oncontextmenu = (e) => {
        e.preventDefault();
        setStepValue(getArr(), index, false, btn);
    };
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
            kind: 'phrase',
            description: () => `${state.masterPhraseSteps} steps / ${state.mainTeeth} teeth × ${state.masterPhraseCycles} ${state.masterPhraseCycles === 1 ? 'cycle' : 'cycles'}`,
            titleEl: null,
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
            description: () => `Phrase (across cycles): ${state.phraseCyclesA} master cycle phrase • ${state.phraseStepsA} steps • clocked at ${masterRateLabelForMeter(state, state.A)} master rate`,
            titleEl: null,
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
            grouping: true,
            groupSize: () => state.teethA,
            allowLaneEdit: false,
            label: () => 'Meter A Pulse',
            kind: 'pulse',
            description: () => `${state.A} groups of ${state.teethA} pulses out of ${state.mainTeeth} pulses per cycle`,
            titleEl: null,
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
            description: () => `Phrase (across cycles): ${state.phraseCyclesB} master cycle phrase • ${state.phraseStepsB} steps • clocked at ${masterRateLabelForMeter(state, state.B)} master rate`,
            titleEl: null,
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
            grouping: true,
            groupSize: () => state.teethB,
            allowLaneEdit: false,
            label: () => 'Meter B Pulse',
            kind: 'pulse',
            description: () => `${state.B} groups of ${state.teethB} pulses out of ${state.mainTeeth} pulses per cycle`,
            titleEl: null,
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

function updateLaneHeader(lane, state) {
    if (lane.titleEl) lane.titleEl.textContent = lane.label();
    if (lane.descriptionEl && lane.description) {
        lane.descriptionEl.textContent = lane.description();
    }
    ensureGroupNudgeControl(lane, state);
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

function ensureGroupNudgeControl(lane, state) {
    if (!lane.allowGroupNudge || !lane.clearBtn || lane.groupNudgeControl) return;

    const nudgeControl = document.createElement('div');
    nudgeControl.className = 'voice-nudge-control group-nudge-control';
    nudgeControl.setAttribute('aria-label', `Nudge all ${lane.label()} voices`);

    const nudgeLabel = document.createElement('span');
    nudgeLabel.className = 'voice-nudge-label';
    nudgeLabel.textContent = 'Nudge Group';

    const nudgeDown = createNudgeButton('←', `Shift all ${lane.label()} voices left`, () => {
        nudgeLaneVoices(lane, -1);
        buildMultiVoiceLane(lane, state);
    });
    const nudgeReset = createNudgeButton('1', `Reset all ${lane.label()} voices to start on 1`, () => {
        resetLaneVoices(lane);
        buildMultiVoiceLane(lane, state);
    }, 'voice-nudge-reset-btn');
    const nudgeUp = createNudgeButton('→', `Shift all ${lane.label()} voices right`, () => {
        nudgeLaneVoices(lane, 1);
        buildMultiVoiceLane(lane, state);
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
    lanes.Awheel.selected = new Array(state.mainTeeth).fill(false);
    lanes.Bwheel.selected = new Array(state.mainTeeth).fill(false);
    for (let g = 0; g < state.A; g++) {
        lanes.Awheel.selected[(g * state.teethA + state.phaseA) % state.mainTeeth] = true;
    }
    for (let g = 0; g < state.B; g++) {
        lanes.Bwheel.selected[(g * state.teethB + state.phaseB) % state.mainTeeth] = true;
    }

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
        const oldLen = v.selected.length;
        resizeVoice(v, state.masterPhraseSteps);
        // Only propagate cycle-0 pattern into newly-grown cycles — never
        // overwrite a cycle the user has already edited.
        if (v.selected.length > oldLen) {
            copyCyclePattern(v, state.mainTeeth, oldLen);
        }
    });
    lanes.Aphrase.voices.forEach(v => resizeVoice(v, state.phraseStepsA));
    lanes.Bphrase.voices.forEach(v => resizeVoice(v, state.phraseStepsB));
    resizeSingleLane(lanes.Awheel, state.mainTeeth, false);
    resizeSingleLane(lanes.Bwheel, state.mainTeeth, false);

    if (lanes.master.voices[0]?.selected.length > 0) lanes.master.voices[0].selected[0] = true;
    if (lanes.Aphrase.voices[0]?.selected.length > 0) lanes.Aphrase.voices[0].selected[0] = true;
    if (lanes.Bphrase.voices[0]?.selected.length > 0) lanes.Bphrase.voices[0].selected[0] = true;
}

/** Copies the first cycle's pattern slice into each subsequent cycle, skipping
    any destination already covered by `skipBefore` (preserving user edits in
    existing cycles when the phrase length grows). */
function copyCyclePattern(voice, cycleLength, skipBefore = 0) {
    const total = voice.selected.length;
    if (cycleLength <= 0 || total <= cycleLength) return;
    for (let src = 0; src < cycleLength; src++) {
        for (let dest = src + cycleLength; dest < total; dest += cycleLength) {
            if (dest < skipBefore) continue;
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

    // Voice label area — control surface grouped into three clusters so the
    // mixer sub-panel (mix) reads distinctly from identity and pattern ops.
    const labelArea = document.createElement('div');
    labelArea.className = 'lane-label-area';

    // Identity group: voice name, instrument, remove.
    const identityGroup = document.createElement('div');
    identityGroup.className = 'voice-control-group identity-group';

    // Mix group: volume + solo/mute — the mixer sub-panel.
    const mixGroup = document.createElement('div');
    mixGroup.className = 'voice-control-group mix-group';

    // Pattern group: clear, edit ops, nudge.
    const patternGroup = document.createElement('div');
    patternGroup.className = 'voice-control-group pattern-group';

    const label = document.createElement('span');
    label.className = 'voice-label';
    label.textContent = `Voice ${voiceIndex + 1}`;
    label.style.color = lane.color;
    identityGroup.appendChild(label);

    // Per-voice instrument selector — sits next to the "Voice N" label in the
    // rail (top row, aligned with the step grid) to keep it associated with its
    // rhythm while reclaiming the horizontal space the inline cell used.
    const instrumentSelect = buildVoiceInstrumentSelect(lane, voice, voiceIndex);
    instrumentSelect.title = `Voice ${voiceIndex + 1} instrument`;
    identityGroup.appendChild(instrumentSelect);

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
        identityGroup.appendChild(removeBtn);
    }

    // Collapse/expand toggle for this voice's rail controls. The identity row
    // (Voice N + instrument) always stays visible; mix + pattern groups hide.
    // New voices (no stored state) default to collapsed on load/reset.
    if (voice.railCollapsed === undefined) voice.railCollapsed = true;
    const railToggle = document.createElement('button');
    railToggle.type = 'button';
    railToggle.className = 'rail-toggle-btn';
    railToggle.textContent = voice.railCollapsed ? '▸' : '▾';
    railToggle.title = voice.railCollapsed ? 'Expand voice controls' : 'Collapse voice controls';
    railToggle.setAttribute('aria-expanded', String(!voice.railCollapsed));
    railToggle.addEventListener('click', () => {
        voice.railCollapsed = !voice.railCollapsed;
        railToggle.textContent = voice.railCollapsed ? '▸' : '▾';
        railToggle.title = voice.railCollapsed ? 'Expand voice controls' : 'Collapse voice controls';
        railToggle.setAttribute('aria-expanded', String(!voice.railCollapsed));
        labelArea.classList.toggle('rail-collapsed', voice.railCollapsed);
    });
    identityGroup.appendChild(railToggle);

    // Nudge control — built here, lands in the pattern group.
    let nudgeControl = null;
    if (lane.allowVoiceNudge) {
        nudgeControl = document.createElement('div');
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
    }

    // Per-voice edit controls (Rnd/Rev/Copy)
    const editControls = createVoiceEditControls(lane, voiceIndex);

    // Per-voice Solo/Mute — own row in the mixer sub-panel (also hosts Clear so
    // Solo / Mute / Clear share one rail row).
    let soloMuteControls = null;
    let soloMuteRow = null;
    if (voice.channel) {
        soloMuteControls = createSoloMuteControls(voice.channel, `solo_${lane.channelPrefix}_${voiceIndex}`, `mute_${lane.channelPrefix}_${voiceIndex}`);
        soloMuteRow = document.createElement('div');
        soloMuteRow.className = 'mix-row';
        soloMuteRow.appendChild(soloMuteControls);
        mixGroup.appendChild(soloMuteRow);
    }

    // Per-voice volume fader — own row in the mixer sub-panel (inserted first so
    // Volume sits above Solo/Mute).
    let volWrap = null;
    if (voice.channel) {
        volWrap = document.createElement('div');
        volWrap.className = 'lane-volume mix-row';
        const volLabel = document.createElement('span');
        volLabel.className = 'lane-volume-label';
        volLabel.textContent = 'Vol';
        const vol = document.createElement('input');
        vol.type = 'range';
        vol.id = `vol_${lane.channelPrefix}_${voiceIndex}`;
        vol.className = 'volume-fader';
        vol.min = '0';
        vol.max = '1';
        vol.step = '0.05';
        vol.value = String(voice.channel.volume ?? 0.5);
        volWrap.append(volLabel, vol);
        voice.channel.volEl = vol;
        vol.addEventListener('input', () => { voice.channel.volume = parseFloat(vol.value); });
        mixGroup.insertBefore(volWrap, mixGroup.firstChild);
    }

    // Clr button for this voice — shares the Solo/Mute row so Solo / Mute / Clear
    // sit together on one rail row.
    let clrBtn = null;
    if (voice.channel) {
        clrBtn = document.createElement('button');
        clrBtn.type = 'button';
        clrBtn.className = 'edit-btn edit-btn-sm';
        clrBtn.textContent = 'Clear';
        clrBtn.title = `Clear voice ${voiceIndex + 1}`;
        clrBtn.addEventListener('click', () => clearVoice(lane, lane.voices[voiceIndex]));
        if (soloMuteRow) soloMuteRow.appendChild(clrBtn);
        else patternGroup.appendChild(clrBtn);
    }

    // Assemble pattern group (edit ops + nudge; Clear moved up to the Solo/Mute row).
    if (editControls) patternGroup.appendChild(editControls);
    if (nudgeControl) patternGroup.appendChild(nudgeControl);

    labelArea.append(identityGroup, mixGroup, patternGroup);
    if (voice.railCollapsed) labelArea.classList.add('rail-collapsed');
    row.appendChild(labelArea);

    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column';

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

/**
 * Updates only the step-button grid when the visible cycle changes,
 * without rebuilding the controls. Keeps any open dropdown intact.
 */
export function updateVoiceStepsForCycle(lane, state) {
    if (!lane.isMultiVoice || !state) return;
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    const totalCycles = lane.totalCycles?.() ?? 1;
    if (totalCycles < 2) return;

    const laneKey = lane.stepId.includes('meterA') ? 'Aphrase'
        : lane.stepId.includes('meterB') ? 'Bphrase' : 'master';
    lane._visibleCycle = state?.visibleCycle?.[laneKey] ?? 0;
    const cycleStart = lane._visibleCycle * stepsPerCycle;

    lane.voices.forEach((voice, idx) => {
        const row = lane.container.querySelector(`.voice-row[data-voice-index="${idx}"]`);
        if (!row) return;
        voice.buttons = [];
        const container = row.querySelector('.voice-steps');
        if (!container) return;

        const buttons = container.querySelectorAll('.step-btn');
        buttons.forEach((btn, i) => {
            const actualIndex = totalCycles > 1 ? cycleStart + i : i;
            const active = !!voice.selected[actualIndex];
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', String(active));
            attachStepHandlers(btn, lane, voice, actualIndex, false);
            voice.buttons.push(btn);
        });
    });

    // Update the cycle-nav label text
    const cycleNav = lane.container?.closest('.matrix-row')?.querySelector('.cycle-nav-label');
    if (cycleNav) {
        const following = state?.followPlayhead?.[laneKey] !== false;
        const current = lane._visibleCycle;
        cycleNav.textContent = following
            ? `AUTO ${current + 1}/${totalCycles}`
            : `PIN ${current + 1}/${totalCycles}`;
        cycleNav.classList.toggle('pinned', !following);
    }

    // Also update the "playhead is in another cycle" cue
    updateCycleCue(lane, state);
}

function updateCycleCue(lane, state) {
    const cue = lane._cue;
    if (!cue) return;
    const totalCycles = lane.totalCycles?.() ?? 1;
    if (totalCycles < 2) { cue.hidden = true; return; }
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    const laneKey = lane.stepId.includes('meterA') ? 'Aphrase'
        : lane.stepId.includes('meterB') ? 'Bphrase' : 'master';
    const following = state?.followPlayhead?.[laneKey] !== false;
    if (following) { cue.hidden = true; return; }
    const activeSteps = lane.voices.map(v => v._currentIndex ?? 0);
    const visibleCycle = lane._visibleCycle ?? 0;
    const anyElsewhere = activeSteps.some(idx => Math.floor(idx / stepsPerCycle) !== visibleCycle);
    if (anyElsewhere) {
        cue.textContent = `▶ playhead in cycle ${Math.floor(activeSteps[0] / stepsPerCycle) + 1}`;
        cue.hidden = false;
    } else {
        cue.hidden = true;
    }
}

/** Updates the visible cycle without rebuilding the lane — keeps selects open. */
function navigateCycle(lane, state, direction) {
    const laneKey = lane.stepId.includes('meterA') ? 'Aphrase'
        : lane.stepId.includes('meterB') ? 'Bphrase' : 'master';
    state.followPlayhead[laneKey] = false;
    const totalCycles = lane.totalCycles?.() ?? 1;
    const current = state.visibleCycle[laneKey] || 0;
    state.visibleCycle[laneKey] = ((current + direction) % totalCycles + totalCycles) % totalCycles;
    updateVoiceStepsForCycle(lane, state);
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
    prevBtn.addEventListener('click', () => navigateCycle(lane, state, -1));

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
        updateVoiceStepsForCycle(lane, state);
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'cycle-nav-btn';
    nextBtn.textContent = '\u25b6';
    nextBtn.title = 'Next cycle';
    nextBtn.addEventListener('click', () => navigateCycle(lane, state, 1));

    nav.append(title, prevBtn, label, nextBtn);
    viewActions.appendChild(nav);
}

/** Builds all voice rows for a multi-voice lane. */
function buildMultiVoiceLane(lane, state) {
    const activeSelect = document.activeElement;
    const activeSelectId = (activeSelect && activeSelect.tagName === 'SELECT' && lane.container.contains(activeSelect)) ? activeSelect.id : null;
    lane.container.innerHTML = '';
    lane.container.style.position = 'relative';
    lane._playheads = [];
    updateLaneHeader(lane, state);

    const totalCycles = lane.totalCycles?.() ?? 1;
    if (totalCycles > 1 && state) {
        addCycleNavigation(lane, state);
    }

    if (state) {
        const laneKey = lane.stepId.includes('meterA') ? 'Aphrase'
            : lane.stepId.includes('meterB') ? 'Bphrase' : 'master';
        lane._visibleCycle = state?.visibleCycle?.[laneKey] ?? 0;
    }

    // Read-only "Master Beat" reference strip (the 4/4 click track the polyrhythm
    // is measured against). It is the reference OVER the polyrhythm, so it lives as
    // the last row of the Polyryhthm Beat Scheme section (alongside the A/B pulse
    // rows), not in the Master lane. It rebuilds with the lane, so remove any prior
    // instance first to avoid accumulation across rebuilds (phrase-length change,
    // cycle advance, reset).
    if (lane.channelPrefix === 'master' && state) {
        const row = document.querySelector('.master-beat-voice-row');
        if (row) {
            row.querySelector('.master-beat-grid')?.remove();
            const ref = buildMasterBeatReference(lane, state);
            row.appendChild(ref);
        }
    }

    lane.voices.forEach((voice, idx) => {
        voice._currentIndex = undefined;
        const row = buildVoiceButtons(lane, voice, idx, state);
        lane.container.appendChild(row);
    });

    // "+ Voice" lives at the bottom of the lane so adding a voice never forces
    // the user to scroll back up to the top toolbar — each new row pushes it
    // further down. It is re-appended on every rebuild because container.innerHTML
    // is cleared above, and its click handler (wired once in app.js) travels with
    // the element.
    if (lane.addVoiceBtn) lane.container.appendChild(lane.addVoiceBtn);

    // "Playhead is in another cycle" cue (shown when this lane is PINned away
    // from the cycle currently playing).
    const cue = document.createElement('div');
    cue.className = 'lane-cycle-cue';
    cue.hidden = true;
    lane.container.appendChild(cue);
    lane._cue = cue;

    applyLaneMixState(lane);

    if (activeSelectId) {
        requestAnimationFrame(() => {
            const sel = document.getElementById(activeSelectId);
            if (sel && sel.showPicker) sel.showPicker();
        });
    }
}

/**
 * Builds the read-only Master Beat reference strip shown at the top of the Master
 * lane. It renders one cell per master tick across every phrase cycle (so it
 * lines up cell-for-cell with the A/B pulse rows) and overlays the steady 4/4
 * click track the polyrhythm is measured against.
 *
 * The 4/4 divisions are positioned at their TRUE time-fractions (q/4 of each
 * cycle), measured from the actual cell geometry — never snapped to a tick cell.
 * When mainTeeth is not divisible by 4 the quarter lines therefore fall BETWEEN
 * pulse cells, which is the honest statement that the meter and the pulse
 * resolution don't perfectly coincide. Purely visual — no audio or editing.
 */
let _mbQuarterObserver = null;
let _mbBeatRAF = null;
let _mbBeatTimer = null;
let _mbLastQuarter = null;
let _mbLastHit = null;

function buildMasterBeatReference(lane, state) {
    // The Master Beat rail (#masterBeatControls) holds the label/instrument/volume/
    // solo/mute; this returns only the reference step grid to sit beside it.
    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column master-beat-grid';
    const steps = document.createElement('div');
    steps.className = 'voice-steps master-beat-steps';

    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    const totalCycles = lane.totalCycles?.() ?? 1;
    const total = stepsPerCycle * totalCycles;
    const mainTeeth = state.mainTeeth;

    // The pulse grid: one cell per master tick, uniformly dimmed. The 4/4 meter
    // itself is drawn by the accurate overlay below (positioned at true fractional
    // quarter positions — never snapped to a cell).
    for (let i = 0; i < total; i++) {
        const cell = document.createElement('div');
        cell.className = 'step-btn master-beat-cell teeth';
        steps.appendChild(cell);
    }

    // Accurate 4/4 overlay: 4 equal time-segments per cycle, each exactly one
    // quarter of the cycle regardless of how many pulse ticks fall inside it.
    const beatLabels = ['1', '2', '3', '4'];
    const quarters = document.createElement('div');
    quarters.className = 'master-beat-quarters';
    for (let c = 0; c < totalCycles; c++) {
        for (let q = 0; q < 4; q++) {
            const band = document.createElement('div');
            band.className = 'mb-quarter' + (q === 0 ? ' mb-quarter-downbeat' : '');
            const label = document.createElement('span');
            label.className = 'mb-quarter-label';
            label.textContent = beatLabels[q];
            band.appendChild(label);
            quarters.appendChild(band);
        }
    }
    steps.appendChild(quarters);

    steps.dataset.mainTeeth = String(mainTeeth);
    steps.dataset.totalCycles = String(totalCycles);
    stepsColumn.appendChild(steps);

    // Position the overlay from real cell geometry so the quarter lines sit at
    // exact fractional ticks (no rounding). Re-runs on layout changes (incl. the
    // rail collapse toggle, which flips the grid between display:none and block).
    _mbQuarterObserver?.disconnect();
    const layout = () => layoutMasterBeatQuarters(steps);
    requestAnimationFrame(layout);
    _mbQuarterObserver = new ResizeObserver(layout);
    _mbQuarterObserver.observe(steps);

    // Light up each numbered beat (1/2/3/4) in time with the Master Beat click.
    // state.mainAngle equals q·quarterDuration, so the beat derived here lands on
    // the exact audio click fired by the scheduler's driver channel.
    if (_mbBeatRAF) cancelAnimationFrame(_mbBeatRAF);
    if (_mbBeatTimer) clearTimeout(_mbBeatTimer);
    _mbBeatRAF = null;
    _mbBeatTimer = null;
    _mbLastQuarter = null;
    _mbLastHit = null;
    _mbBeatRAF = requestAnimationFrame(() => animateMasterBeatQuarters(state, steps));

    return stepsColumn;
}

/**
 * Positions the Master Beat 4/4 overlay bands at their true fractional tick
 * positions, measured from the rendered pulse cells so the result is exact
 * regardless of cell width, gap, or whether mainTeeth divides by 4.
 */
function layoutMasterBeatQuarters(steps) {
    const cells = steps.querySelectorAll('.master-beat-cell');
    const quarters = steps.querySelector('.master-beat-quarters');
    if (!cells.length || !quarters) return;
    const first = cells[0];
    const last = cells[cells.length - 1];
    const left0 = first.offsetLeft;
    const span = (last.offsetLeft + last.offsetWidth) - left0;
    if (span <= 0) return;
    const total = cells.length;
    const perTick = span / total;
    const mainTeeth = Number(steps.dataset.mainTeeth);
    const totalCycles = Number(steps.dataset.totalCycles);
    if (!mainTeeth || !totalCycles) return;
    const bands = quarters.querySelectorAll('.mb-quarter');
    let idx = 0;
    for (let c = 0; c < totalCycles; c++) {
        for (let q = 0; q < 4; q++) {
            const band = bands[idx++];
            const t0 = c * mainTeeth + (q * mainTeeth) / 4;
            band.style.left = (left0 + t0 * perTick) + 'px';
            band.style.width = ((mainTeeth / 4) * perTick) + 'px';
        }
    }
}

/**
 * Flashes the numbered Master Beat band (1/2/3/4) that corresponds to the
 * current quarter, in sync with the audio click track. Reads state.mainAngle
 * (which equals q·quarterDuration), so the lit band matches the driver channel's
 * hit fired by the scheduler. The beat's band index is (cycle·4 + beat), where
 * beat = q mod 4 and cycle = floor(q/4) mod totalCycles — so multi-cycle phrases
 * light the band in whichever cycle is currently playing.
 */
function animateMasterBeatQuarters(state, steps) {
    const bands = steps.querySelectorAll('.mb-quarter');
    if (bands.length) {
        const currentQuarter = Math.floor((state.mainAngle || 0) / (Math.PI / 2));
        const totalCycles = Number(steps.dataset.totalCycles) || 1;
        if (state.playing) {
            if (currentQuarter !== _mbLastQuarter) {
                _mbLastQuarter = currentQuarter;
                const beat = ((currentQuarter % 4) + 4) % 4;
                const cycle = (((Math.floor(currentQuarter / 4)) % totalCycles) + totalCycles) % totalCycles;
                const band = bands[cycle * 4 + beat];
                if (band) {
                    if (_mbLastHit && _mbLastHit !== band) _mbLastHit.classList.remove('is-hit');
                    band.classList.remove('is-hit');
                    band.classList.add('is-hit');
                    _mbLastHit = band;
                    if (_mbBeatTimer) clearTimeout(_mbBeatTimer);
                    _mbBeatTimer = setTimeout(() => {
                        band.classList.remove('is-hit');
                        if (_mbLastHit === band) _mbLastHit = null;
                    }, 160);
                }
            }
        } else {
            _mbLastQuarter = currentQuarter;
        }
    }
    _mbBeatRAF = requestAnimationFrame(() => animateMasterBeatQuarters(state, steps));
}

/** Builds a single-voice lane. */
function buildSingleLane(lane) {
    lane.container.innerHTML = '';
    updateLaneHeader(lane);
    lane.container.style.position = 'relative';
    lane.buttons = [];
    // Wrap steps in the same box (voice-steps-column > voice-steps) as the multi-voice
    // lanes, so wheel lanes share the left-rail + step-grid layout.
    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column';
    const steps = document.createElement('div');
    steps.className = 'voice-steps';
    lane.container.appendChild(stepsColumn);
    stepsColumn.appendChild(steps);
    for (let i = 0; i < lane.count(); i++) {
        const btn = createStepButtonForSingle(lane, i);
        steps.appendChild(btn);
        lane.buttons.push(btn);
    }
    const playhead = document.createElement('div');
    playhead.className = 'lane-playhead lane-playhead-single';
    playhead.setAttribute('aria-hidden', 'true');
    stepsColumn.appendChild(playhead);
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

/**
 * Adds a collapse/expand toggle to a static lane left rail (the Meter A/B Pulse
 * and Master Beat rails), mirroring the per-voice rail toggle used by the phrase
 * lanes. The identity row stays visible; the mix + pattern groups hide when
 * collapsed. Returns the created button (or null if no identity group exists).
 */
export function attachRailCollapseToggle(labelArea, { collapsed = false, label = 'controls', extraTarget = null } = {}) {
    const identityGroup = labelArea.querySelector('.identity-group');
    if (!identityGroup) return null;

    let isCollapsed = collapsed;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rail-toggle-btn';
    const sync = () => {
        toggle.textContent = isCollapsed ? '▸' : '▾';
        toggle.title = isCollapsed ? `Expand ${label}` : `Collapse ${label}`;
        toggle.setAttribute('aria-expanded', String(!isCollapsed));
        labelArea.classList.toggle('rail-collapsed', isCollapsed);
        if (extraTarget) extraTarget.classList.toggle('rail-collapsed', isCollapsed);
    };
    // Lets callers (e.g. mixer reset) force the collapsed state without a click,
    // mirroring how the phrase voice rails reset to collapsed.
    toggle.setCollapsed = (val) => { isCollapsed = !!val; sync(); };
    sync();
    toggle.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        sync();
    });
    identityGroup.appendChild(toggle);
    return toggle;
}

/** Controllers for the static pulse-section rails, populated by wirePulseRailCollapses. */
const _pulseRailControllers = [];

/** Wires collapse toggles onto the static pulse-section rails. */
export function wirePulseRailCollapses({ defaultCollapsed = true } = {}) {
    const defs = [
        { id: 'meterAWheelRail', label: 'Meter A Pulse controls' },
        { id: 'meterBWheelRail', label: 'Meter B Pulse controls' },
        // The Master Beat 4/4 click-track grid is a sibling of the rail and must
        // stay visible at all times (like the Meter A/B step strips), so collapsing
        // the rail only hides its own controls — not the reference grid.
        { id: 'masterBeatControls', label: 'Master Beat controls' }
    ];
    _pulseRailControllers.length = 0;
    defs.forEach(({ id, label, extraTarget }) => {
        const rail = document.getElementById(id);
        if (!rail) return;
        const toggle = attachRailCollapseToggle(rail, { label, extraTarget, collapsed: defaultCollapsed });
        if (toggle?.setCollapsed) _pulseRailControllers.push(toggle.setCollapsed);
    });
}

/** Re-collapses every pulse-section rail (used by mixer reset, matching the default load state). */
export function collapsePulseRails() {
    _pulseRailControllers.forEach(set => set(true));
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

/** Converts a #rrggbb color into an rgba() string at the given alpha. */
function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Builds a "pulse grouping" lane: every master pulse (mainTeeth cells) rendered
 * on one shared scale, partitioned into the meter's equal groups. The first pulse
 * of each group is the beat onset (full color); the remaining pulses are a dim
 * fill, so the grouping that defines the polyrhythm is visible at a glance.
 * Each cell toggles its whole group, preserving the wheel's selected[] pattern.
 */
function buildGroupingLane(lane, state) {
    lane.container.innerHTML = '';
    updateLaneHeader(lane, state);
    lane.container.style.position = 'relative';
    lane.buttons = [];
    lane._markedPulse = null;

    const total = state.mainTeeth;
    const groupSize = lane.groupSize();

    for (let p = 0; p < total; p++) {
        const groupIndex = Math.floor(p / groupSize);
        const isOnset = p % groupSize === 0;
        const active = !!lane.selected[p];

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `step-btn ${lane.className}`;
        btn.id = `${lane.stepId}-p${p}`;
        btn.textContent = isOnset ? String(groupIndex + 1) : String((p % groupSize) + 1);
        btn.setAttribute('aria-pressed', String(active));

        if (isOnset) btn.classList.add('step-bar');
        if (groupIndex % 2 === 1) btn.classList.add('step-alt');

        if (active) {
            btn.classList.add('active');
        } else {
            btn.classList.add('inactive-group');
            btn.style.background = hexToRgba(lane.color, 0.06);
        }

        btn.addEventListener('click', () => {
            lane.selected[p] = !lane.selected[p];
            buildGroupingLane(lane, state);
        });

        lane.container.appendChild(btn);
        lane.buttons.push(btn);
    }

    const playhead = document.createElement('div');
    playhead.className = 'lane-playhead lane-playhead-single';
    playhead.setAttribute('aria-hidden', 'true');
    lane.container.appendChild(playhead);
    lane._playhead = playhead;
}

/** Builds all step buttons for a lane, replacing any existing content. */
export function buildLane(lane, state) {
    if (lane.isMultiVoice) {
        buildMultiVoiceLane(lane, state);
    } else if (lane.grouping) {
        buildGroupingLane(lane, state);
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
export function wireLaneClearButtons(lanes, state) {
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
                buildLane(lane, state);
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

/** Replaces a single voice's pattern with a random one (~40% density). */
function randomizeVoice(lane, voice) {
    for (let i = 0; i < voice.selected.length; i++) voice.selected[i] = Math.random() < 0.4;
    buildLane(lane);
}

/** Reverses a single voice's pattern in place. */
function reverseVoice(lane, voice) {
    voice.selected.reverse();
    buildLane(lane);
}

/** Clears a single voice's pattern (all steps off). */
function clearVoice(lane, voice) {
    voice.selected.fill(false);
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
        mk('Random', `Randomize voice ${voiceIndex + 1}`, () => randomizeVoice(lane, lane.voices[voiceIndex])),
        mk('Reverse', `Reverse voice ${voiceIndex + 1}`, () => reverseVoice(lane, lane.voices[voiceIndex])),
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
    if (lane.allowLaneEdit === false) return;
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
        mkBtn('Reverse', `Reverse ${name}`, () => reverseLane(lane))
    );
    parent.appendChild(group);
}

/**
 * Builds Solo/Mute buttons bound to a channel. These are mounted directly in
 * the affected sequence (lane header for single-channel lanes, voice row for
 * multi-voice lanes) rather than the disconnected Sound Mixer. Reuses the
 * original element ids (e.g. soloDriver, solo_master_1) so external tests and
 * state restore keep working. Pass `{ solo: false }` to render Mute only (used
 * for the Master lane, whose per-voice Solo already covers it).
 */
function createSoloMuteControls(channel, idSolo, idMute, { solo = true } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'voice-mix-controls';

    let soloBtn = null;
    if (solo) {
        soloBtn = document.createElement('button');
        soloBtn.type = 'button';
        soloBtn.className = 'solo-btn';
        soloBtn.id = idSolo;
        soloBtn.textContent = channel.soloed ? 'Soloed' : 'Solo';
    }

    const mute = document.createElement('button');
    mute.type = 'button';
    mute.className = 'mute-btn';
    mute.id = idMute;
    mute.textContent = channel.muted ? 'Muted' : 'Mute';

    if (soloBtn) wrap.append(soloBtn);
    wrap.append(mute);
    if (soloBtn) channel.soloEl = soloBtn;
    channel.muteEl = mute;
    bindSoloMute(channel, _mixChannels);
    return wrap;
}

/**
 * Mounts Solo/Mute for the single-channel lanes whose buttons live in the lane
 * toolbar (Meter A/B Pulse → Awheel/Bwheel channels) plus the master wheel's
 * `driver` channel on the Master lane header. Multi-voice lanes get theirs per
 * voice inside buildVoiceButtons.
 */
export function wireLaneMixButtons(lanes, channels) {
    const mountFor = (lane) =>
        lane.container?.closest('.matrix-row')?.querySelector('.lane-actions');
    const add = (lane, channel, idSolo, idMute, mountSel) => {
        const matrixRow = lane.container?.closest('.matrix-row');
        const mount = mountSel ? matrixRow?.querySelector(mountSel) : mountFor(lane);
        if (!mount || !channel) return;
        if (mount.querySelector(`#${idSolo}`)) return; // already wired
        mount.appendChild(createSoloMuteControls(channel, idSolo, idMute));
    };

    // Wheel lanes + master beat: Solo/Mute live in the lane's left-rail mix-group,
    // matching the phrase-lane voice rows.
    add(lanes.Awheel, channels.Awheel, 'soloAWheel', 'muteAWheel', '.mix-group');
    add(lanes.Bwheel, channels.Bwheel, 'soloBWheel', 'muteBWheel', '.mix-group');

    // 'driver' is the master wheel (the Master Beat reference). Its instrument,
    // volume, and solo/mute are colocated in the Master Beat rail.
    const beatControls = document.getElementById('masterBeatControls');
    if (beatControls && channels.driver) {
        const mixGroup = beatControls.querySelector('.mix-group');
        if (mixGroup && !beatControls.querySelector('#soloDriver')) {
            mixGroup.appendChild(createSoloMuteControls(channels.driver, 'soloDriver', 'muteDriver'));
        }
    }

    // Reorder phrase lane toolbar controls: Random/Reverse, Clear, Nudge Group
    // (+ Voice is now pinned to the bottom of the lane, below the voice rows).
    reorderWheelLaneControls(mountFor(lanes.master), ['.lane-edit-controls', 'clearMasterBtn', '.group-nudge-control']);
    reorderWheelLaneControls(mountFor(lanes.Aphrase), ['.lane-edit-controls', 'clearAPhraseBtn', '.group-nudge-control']);
    reorderWheelLaneControls(mountFor(lanes.Bphrase), ['.lane-edit-controls', 'clearBPhraseBtn', '.group-nudge-control']);
}

    function reorderWheelLaneControls(mount, selectors) {
        if (!mount) return;
        selectors.forEach((sel) => {
            const el = sel.startsWith('.') ? mount.querySelector(sel) : document.getElementById(sel);
            if (el) mount.appendChild(el);
        });
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

        lane.voices.forEach((voice, voiceIndex) => {
            if (voice._currentIndex != null) {
                removeCurrentClass(voice.buttons[voice._currentIndex]);
                voice._currentIndex = undefined;
            }
            const displayedCurr = currentIndexes[voiceIndex] - cycleStart;
            const isInView = displayedCurr >= 0 && displayedCurr < stepsPerCycle;
            if (following) {
                if (isInView) {
                    addCurrentClass(voice.buttons[displayedCurr]);
                    voice._currentIndex = displayedCurr;
                    positionPlayhead(lane._playheads?.[voiceIndex], displayedCurr, stepsPerCycle);
                }
            } else {
                const activeInVisible = currentIndexes[voiceIndex] - cycleStart;
                if (activeInVisible >= 0 && activeInVisible < stepsPerCycle) {
                    addCurrentClass(voice.buttons[activeInVisible]);
                    voice._currentIndex = activeInVisible;
                    positionPlayhead(lane._playheads?.[voiceIndex], activeInVisible, stepsPerCycle);
                }
            }
        });

        if (following) {
            if (lane._cue) lane._cue.hidden = true;
        } else {
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

function markSingleVoiceCurrentButtons(lane, previous, next, state, masterPulse) {
    if (lane.grouping) {
        // Tick the playhead along at the master-wheel pulse rate (one cell per
        // master step) rather than jumping onset-to-onset. The group onsets keep
        // their own steady highlight via the `active` fill, so the grouping and
        // its overlap/cycle stay legible as the playhead sweeps every pulse.
        const total = state.mainTeeth;
        const pulse = ((masterPulse % total) + total) % total;
        if (lane._markedPulse != null && lane._markedPulse !== pulse) {
            removeCurrentClass(lane.buttons[lane._markedPulse]);
        }
        addCurrentClass(lane.buttons[pulse]);
        lane._markedPulse = pulse;
        positionPlayhead(lane._playhead, pulse, total);
        return;
    }
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
            markSingleVoiceCurrentButtons(lane, prev[key], index, state, active.master);
        }
    }
}
