/**
 * grouping-lanes.js — Rhythm Tracks grouping lanes.
 *
 * Replaces the fixed Meter A/B Phrase lanes with a dynamic list of equal
 * groupings of the master cycle. A lane with N groups shows N step boxes per
 * cycle (one per group) and fires once per group. Each lane is a full
 * multi-voice phrase lane: + Voice, per-voice instrument/volume/solo/mute,
 * nudge, random/reverse, copy/paste, and a phrase cycle length.
 *
 * The default list is two lanes representing the chosen polyrhythm (A and B
 * groupings). Extra groupings — any divisor of the frame — can be added with
 * "+ Grouping".
 *
 * Lane objects are shaped to reuse the existing phrase-lane renderer
 * (buildMultiVoiceLane via buildLane); this module owns their DOM, channels,
 * and pattern lifecycle.
 */
import { getActivePhraseStep, isOnQuarter, quarterBeatPeriod, lcm } from './math.js';
import { createVoiceChannel } from './channels.js';
import { buildLane } from './lanes.js';

const COLORS = ['#ff3366', '#00e5ff', '#ff9100', '#8be28b', '#c07ae6', '#ffd166', '#f4845f', '#7bdff2'];
const MAX_CYCLES = 8;
const DEFAULT_SOUND = 'clap';

let _deps = null;
let _nextId = 0;
let _colorCursor = 0;

/** Group counts available for a frame: every divisor of `frame`, including 1
    (the whole master cycle as a single group). */
export function divisorsForGroups(frame) {
    const out = [];
    if (!Number.isInteger(frame) || frame < 1) return out;
    for (let d = 1; d <= frame; d++) {
        if (frame % d === 0) out.push(d);
    }
    return out;
}

function nearestValue(values, target) {
    if (!values.length) return target;
    return values.reduce((best, v) => Math.abs(v - target) < Math.abs(best - target) ? v : best, values[0]);
}

function makeVoice() {
    return { selected: [], buttons: [], nudgeOffset: 0, channel: null, railCollapsed: true };
}

/** Builds a lane object shaped for the multi-voice phrase renderer. */
function makeLane(state, { groupCount, cycles = 1, linked = null, color = null }) {
    const id = _nextId++;
    const lane = {
        id,
        groupCount,
        cycles,
        linked,
        // Offset: which pulse within the group the grouping starts on
        // (0..groupSize-1). Only meaningful when groupSize > 1.
        phase: 0,
        color: color || COLORS[_colorCursor++ % COLORS.length],
        cycleKey: `grouping_${id}`,
        channelPrefix: `grouping_${id}`,
        className: 'grouping-btn',
        stepId: `grouping-${id}-step`,
        kind: 'phrase',
        isMultiVoice: true,
        allowVoiceNudge: true,
        // Group nudge / lane clear / random / reverse live in the per-voice rail,
        // not in the lane toolbar.
        allowGroupNudge: false,
        voices: [],
        voiceChannels: [],
        onRemoveVoice: null,
        titleEl: null,
        descriptionEl: null,
        infoBtn: null,
        container: null,
        addVoiceBtn: null,
        clearBtn: null,
        rootEl: null,
        groupSelect: null,
        cyclesSelect: null,
        _lastStep: -1
    };
    // Derived values read lane.groupCount/cycles live.
    lane.count = () => lane.groupCount * lane.cycles;
    lane.stepsPerCycle = () => lane.groupCount;
    lane.totalCycles = () => lane.cycles;
    lane.groupSize = () => state.mainTeeth / lane.groupCount;
    lane.label = () => `${lane.groupCount} ${lane.groupCount === 1 ? 'group' : 'groups'}`;
    lane.description = () => {
        const size = groupSizeFor(state, lane.groupCount);
        const groups = `${lane.groupCount} ${lane.groupCount === 1 ? 'group' : 'groups'} of ${size} ${size === 1 ? 'pulse' : 'pulses'} per master cycle`;
        const cycles = `${lane.count()} steps across ${lane.cycles} ${lane.cycles === 1 ? 'cycle' : 'cycles'}`;
        const offset = size > 1
            ? ` Each box is one group, split into its ${size} pulses; the highlighted segment is where the grouping starts (Offset ${lane.phase + 1}/${size}). Nudge Offset ← → to slide the grouping within its group.`
            : ` The grouping spans the whole master cycle (one onset per cycle).`;
        return `${groups} • ${cycles}.${offset}`;
    };
    lane.textForStep = i => (i % lane.groupCount) + 1;
    // Pulse segments drawn inside each group cell, with the offset marking the
    // grouping's start pulse.
    lane.stepSlices = () => groupSizeFor(state, lane.groupCount);
    lane.stepPhase = () => lane.phase;
    lane.isBar = i => (i % lane.groupCount) === 0;
    lane.isBeat = i => isOnQuarter((i * (state.mainTeeth / lane.groupCount) + lane.phase) % state.mainTeeth, state.mainTeeth);
    lane.beatPeriod = () => quarterBeatPeriod(lane.groupCount);
    return lane;
}

/** Pulses per group for a lane (mainTeeth / groupCount), at least 1. */
function groupSizeFor(state, groupCount) {
    if (!Number.isInteger(groupCount) || groupCount <= 0) return 1;
    const size = Math.round(state.mainTeeth / groupCount);
    return size >= 1 ? size : 1;
}

/** Keeps lane.phase within 0..groupSize-1 after a grouping or frame change. */
function normalizePhase(lane) {
    const size = groupSizeFor(_deps.state, lane.groupCount);
    if (size < 2) { lane.phase = 0; return; }
    const p = Math.round(lane.phase) || 0;
    lane.phase = ((p % size) + size) % size;
}

/** Shifts a lane's grouping start by one pulse (wrapping within the group). */
function shiftPhase(lane, direction) {
    const size = groupSizeFor(_deps.state, lane.groupCount);
    if (size < 2) return;
    lane.phase = ((lane.phase + direction) % size + size) % size;
    rebuildGroupingLane(lane);
}

/** Creates a voice + channel on a lane and renders it. */
export function addGroupingVoice(lane) {
    if (!_deps) return null;
    const voice = makeVoice();
    voice.selected = new Array(lane.count()).fill(false);
    // Match the old phrase-lane default: the first voice starts on step 1.
    if (lane.voices.length === 0 && voice.selected.length > 0) voice.selected[0] = true;
    const voiceIndex = lane.voices.length;
    lane.voices.push(voice);

    const channel = createVoiceChannel(lane.container, voiceIndex, lane.channelPrefix,
        { [lane.channelPrefix]: DEFAULT_SOUND }, 0.5);
    voice.channel = channel;
    lane.voiceChannels.push(channel);
    _deps.channels.groupingVoices.push(channel);
    return voice;
}

/** Removes a voice's channel when its sequencer row is removed. */
function removeVoiceChannel(lane, voiceIndex) {
    lane.voiceChannels.splice(voiceIndex, 1);
    // Rebuild the flat list from every lane to stay consistent after re-indexing.
    _deps.channels.groupingVoices = _deps.lanes.grouping.flatMap(l => l.voiceChannels);
}

/** Resizes every voice's pattern to the lane's current length. */
function resizeLaneVoices(lane, { fillNew = false } = {}) {
    const length = lane.count();
    lane.voices.forEach(voice => {
        const old = voice.selected;
        const next = new Array(length).fill(fillNew);
        const copy = Math.min(old.length, length);
        for (let i = 0; i < copy; i++) next[i] = old[i];
        voice.selected = next;
        voice.nudgeOffset = 0;
    });
}

/** Resets a lane's voices to the default pattern (first voice on step 1). */
function resetLaneVoicesToDefault(lane) {
    const length = lane.count();
    lane.voices.forEach((voice, i) => {
        voice.selected = new Array(length).fill(false);
        if (i === 0 && length > 0) voice.selected[0] = true;
        voice.nudgeOffset = 0;
    });
}

/** Builds the matrix-row + toolbar + grid for one grouping lane. */
function buildLaneRow(lane, state) {
    const row = document.createElement('div');
    row.className = 'matrix-row grouping-lane-row';
    row.style.setProperty('--lane-accent', lane.color);
    row.dataset.groupingId = String(lane.id);

    const toolbar = document.createElement('div');
    toolbar.className = 'lane-toolbar';
    const actions = document.createElement('div');
    actions.className = 'lane-actions';

    // Grouping selector
    const gGroup = document.createElement('div');
    gGroup.className = 'control-group lane-meter-select grouping-count-group';
    const gLabel = document.createElement('label');
    gLabel.textContent = 'Grouping';
    gLabel.style.color = lane.color;
    const gSel = document.createElement('select');
    gSel.className = 'grouping-count-select';
    gSel.title = 'Number of equal groups in the master cycle';
    divisorsForGroups(state.mainTeeth).forEach(d => {
        const opt = document.createElement('option');
        opt.value = String(d);
        opt.textContent = `${d} ${d === 1 ? 'group' : 'groups'}`;
        gSel.appendChild(opt);
    });
    gSel.value = String(lane.groupCount);
    gSel.addEventListener('change', () => {
        lane.groupCount = parseInt(gSel.value, 10);
        lane.linked = null;
        normalizePhase(lane);
        resizeLaneVoices(lane, { fillNew: false });
        rebuildGroupingLane(lane);
    });
    gGroup.append(gLabel, gSel);

    // Phrase length (cycles)
    const cGroup = document.createElement('div');
    cGroup.className = 'control-group lane-meter-select grouping-cycles-group';
    const cLabel = document.createElement('label');
    cLabel.textContent = 'Phrase Length';
    cLabel.style.color = lane.color;
    const cSel = document.createElement('select');
    cSel.className = 'grouping-cycles-select';
    cSel.title = 'Number of master cycles this grouping spans';
    for (let c = 1; c <= MAX_CYCLES; c++) {
        const opt = document.createElement('option');
        opt.value = String(c);
        opt.textContent = `${c} ${c === 1 ? 'cycle' : 'cycles'}`;
        cSel.appendChild(opt);
    }
    cSel.value = String(lane.cycles);
    cSel.addEventListener('change', () => {
        lane.cycles = parseInt(cSel.value, 10);
        resizeLaneVoices(lane, { fillNew: false });
        rebuildGroupingLane(lane);
    });
    cGroup.append(cLabel, cSel);

    // Offset nudge: shifts which pulse within the group the grouping starts on.
    // Visualized by the highlighted slice inside each group cell.
    const offsetSize = groupSizeFor(state, lane.groupCount);
    let oGroup = null;
    if (offsetSize >= 2) {
        oGroup = document.createElement('div');
        oGroup.className = 'control-group lane-meter-select grouping-offset-group';
        const oLabel = document.createElement('label');
        oLabel.textContent = 'Offset';
        oLabel.style.color = lane.color;
        const nudge = document.createElement('div');
        nudge.className = 'grouping-offset-nudge';
        const oPrev = document.createElement('button');
        oPrev.type = 'button';
        oPrev.className = 'voice-nudge-btn grouping-offset-prev';
        oPrev.textContent = '←';
        oPrev.title = 'Shift the grouping start left';
        oPrev.addEventListener('click', () => shiftPhase(lane, -1));
        const oVal = document.createElement('span');
        oVal.className = 'grouping-offset-value';
        oVal.textContent = `${lane.phase + 1}/${offsetSize}`;
        const oNext = document.createElement('button');
        oNext.type = 'button';
        oNext.className = 'voice-nudge-btn grouping-offset-next';
        oNext.textContent = '→';
        oNext.title = 'Shift the grouping start right';
        oNext.addEventListener('click', () => shiftPhase(lane, 1));
        nudge.append(oPrev, oVal, oNext);
        oGroup.append(oLabel, nudge);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-voice-btn';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove this grouping lane';
    removeBtn.addEventListener('click', () => {
        const idx = _deps.lanes.grouping.indexOf(lane);
        if (idx >= 0) removeGroupingLane(idx);
    });

    // Toolbar holds this lane's own grouping + phrase-length + offset controls
    // and the remove button. Clear / Random / Reverse / Nudge and the per-voice
    // mix controls live in the voice's collapsible rail (the ▸ dropdown),
    // and + Voice sits at the bottom of the step boxes like the Master lane.
    actions.append(gGroup, cGroup);
    if (oGroup) actions.appendChild(oGroup);
    actions.append(removeBtn);

    const viewActions = document.createElement('div');
    viewActions.className = 'lane-view-actions';
    const infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'lane-info-btn';
    infoBtn.textContent = '?';
    infoBtn.setAttribute('aria-label', 'Show grouping lane explanation');
    viewActions.appendChild(infoBtn);

    toolbar.append(actions, viewActions);
    row.appendChild(toolbar);

    const descriptionEl = document.createElement('div');
    descriptionEl.className = 'lane-description';
    descriptionEl.hidden = true;
    row.appendChild(descriptionEl);

    const grid = document.createElement('div');
    grid.className = 'sequencer-container';
    row.appendChild(grid);

    lane.rootEl = row;
    lane.container = grid;
    // No per-lane + Voice: a single + Voice sits below the whole grouping list
    // (see buildGroupingLanes), mirroring the Master lane.
    lane.addVoiceBtn = null;
    // No lane-level clearBtn: it would make ensureGroupNudgeControl / the lane
    // edit controls mount above the grid again. Per-voice controls cover this.
    lane.clearBtn = null;
    lane.groupNudgeControl = null;
    lane.descriptionEl = descriptionEl;
    lane.infoBtn = infoBtn;
    lane.groupSelect = gSel;
    lane.cyclesSelect = cSel;
    lane.onRemoveVoice = (voiceIndex) => removeVoiceChannel(lane, voiceIndex);

    infoBtn.addEventListener('click', () => {
        const show = descriptionEl.hidden;
        descriptionEl.hidden = !show;
        infoBtn.setAttribute('aria-expanded', String(show));
    });

    return row;
}

/** Rebuilds every grouping lane's DOM. */
/** Appends the single + Voice button that adds a new grouping lane. */
function appendAddVoiceButton(container) {
    const addVoiceBtn = document.createElement('button');
    addVoiceBtn.type = 'button';
    addVoiceBtn.className = 'add-voice-btn';
    addVoiceBtn.textContent = '+ Voice';
    addVoiceBtn.title = 'Add a new grouping voice lane';
    addVoiceBtn.addEventListener('click', () => addGroupingLane());
    container.appendChild(addVoiceBtn);
}

/**
 * Builds (or rebuilds in place) a single lane's DOM. Used both for the full
 * list build and for targeted rebuilds when only one lane's grouping/cycles
 * change — avoiding a teardown/recreate of every lane's step grid.
 */
function renderLaneRow(lane, index) {
    const { state, container } = _deps;
    lane._lastStep = -1;
    if (lane.voices.length === 0) addGroupingVoice(lane);
    lane.voices.forEach(v => { v._currentIndex = undefined; });
    // Capture the previous row before buildLaneRow overwrites lane.rootEl.
    const oldRow = lane.rootEl;
    const row = buildLaneRow(lane, state);
    if (oldRow && oldRow.parentElement === container) {
        oldRow.replaceWith(row);
    } else {
        container.appendChild(row);
    }
    buildLane(lane, state);
    // Label each lane's (single) voice by lane number so the list reads
    // "Voice 1, Voice 2, …" across lanes rather than "Voice 1" in every lane.
    const firstLabel = lane.container.querySelector('.voice-row .voice-label');
    if (firstLabel) firstLabel.textContent = `Voice ${index + 1}`;
}

/** Rebuilds only the given lane (keeps the other lanes' DOM untouched). */
function rebuildGroupingLane(lane) {
    if (!_deps) return;
    const index = _deps.lanes.grouping.indexOf(lane);
    if (index < 0) return;
    renderLaneRow(lane, index);
    updateFullPatternCycles();
    if (typeof _deps.onChange === 'function') _deps.onChange();
}

export function buildGroupingLanes() {
    if (!_deps) return;
    const { lanes, container } = _deps;
    container.innerHTML = '';
    lanes.grouping.forEach((lane, index) => renderLaneRow(lane, index));
    // A single + Voice at the bottom of the list adds a new grouping lane —
    // mirroring the Master lane's one + Voice button.
    appendAddVoiceButton(container);
    _lastSyncedFrame = _deps.state.mainTeeth;
    updateFullPatternCycles();
    if (typeof _deps.onChange === 'function') _deps.onChange();
}

/** Initializes the dynamic grouping lane list (defaults to the A and B groupings). */
export function initGroupingLanes(deps) {
    _deps = deps;
    _nextId = 0;
    _colorCursor = 0;
    deps.lanes.grouping = [];
    const a = makeLane(deps.state, { groupCount: deps.state.A || 6, linked: 'A', color: COLORS[0] });
    const b = makeLane(deps.state, { groupCount: deps.state.B || 4, linked: 'B', color: COLORS[1] });
    deps.lanes.grouping.push(a, b);
    ensureCycleKeys(deps);
    buildGroupingLanes();
}

function ensureCycleKeys(deps) {
    deps.lanes.grouping.forEach(lane => {
        if (deps.state.followPlayhead[lane.cycleKey] === undefined) deps.state.followPlayhead[lane.cycleKey] = true;
        if (deps.state.visibleCycle[lane.cycleKey] === undefined) deps.state.visibleCycle[lane.cycleKey] = 0;
    });
}

/** Adds a new grouping lane (defaults to a mid-size valid grouping). */
export function addGroupingLane(groupCount = null) {
    if (!_deps) return null;
    const { state, lanes } = _deps;
    const valid = divisorsForGroups(state.mainTeeth);
    const count = valid.includes(groupCount) ? groupCount : nearestValue(valid, state.B);
    const lane = makeLane(state, { groupCount: count, linked: null });
    lanes.grouping.push(lane);
    ensureCycleKeys(_deps);
    buildGroupingLanes();
    return lane;
}

/** Removes a grouping lane by index (never removes the last lane). */
export function removeGroupingLane(index) {
    if (!_deps) return;
    const { lanes, state } = _deps;
    if (lanes.grouping.length <= 1 || index < 0 || index >= lanes.grouping.length) return;
    const [removed] = lanes.grouping.splice(index, 1);
    delete state.followPlayhead[removed.cycleKey];
    delete state.visibleCycle[removed.cycleKey];
    _deps.channels.groupingVoices = lanes.grouping.flatMap(l => l.voiceChannels);
    buildGroupingLanes();
}

/**
 * Re-validates lanes against the current frame after a meter change. Linked
 * lanes (the default A/B lanes) follow their meter; unlinked lanes snap to the
 * nearest valid divisor. Rebuilds the DOM.
 */
let _lastSyncedFrame = -1;

export function syncGroupingLanesToFrame() {
    if (!_deps) return;
    const { state, lanes } = _deps;
    const frame = state.mainTeeth;
    const valid = divisorsForGroups(frame);
    // A frame change alters the available groupings (option lists), so every
    // lane must rebuild; otherwise only rebuild if a lane's count actually
    // changed. This avoids tearing down all grouping lanes when an unrelated
    // control (e.g. Master Phrase Length) triggers a system rebuild.
    let changed = frame !== _lastSyncedFrame;

    lanes.grouping.forEach(lane => {
        const previous = lane.groupCount;
        if (lane.linked === 'A' || lane.linked === 'B') {
            const target = state[lane.linked];
            if (valid.includes(target)) {
                lane.groupCount = target;
            } else {
                lane.groupCount = nearestValue(valid, target);
            }
        } else if (!valid.includes(lane.groupCount)) {
            lane.groupCount = nearestValue(valid, lane.groupCount);
        }
        // A grouping change invalidates the old step pattern; reset to default.
        if (lane.groupCount !== previous) {
            resetLaneVoicesToDefault(lane);
            changed = true;
        }
        // groupSize depends on mainTeeth, so the offset can go out of range.
        normalizePhase(lane);
    });

    _lastSyncedFrame = frame;
    // The full-pattern length also depends on non-grouping cycles, so keep it
    // current even when no lane needs a DOM rebuild.
    updateFullPatternCycles();
    if (changed) buildGroupingLanes();
}

/** Restores the default two A/B grouping lanes. */
export function resetGroupingLanes() {
    if (!_deps) return;
    const { state, lanes, channels } = _deps;
    _nextId = 0;
    _colorCursor = 0;
    lanes.grouping = [];
    channels.groupingVoices = [];
    state.followPlayhead = { master: true };
    state.visibleCycle = { master: 0 };
    const a = makeLane(state, { groupCount: state.A, linked: 'A', color: COLORS[0] });
    const b = makeLane(state, { groupCount: state.B, linked: 'B', color: COLORS[1] });
    lanes.grouping.push(a, b);
    ensureCycleKeys(_deps);
    buildGroupingLanes();
}

function updateFullPatternCycles() {
    const { state, lanes } = _deps;
    const cycles = [state.masterPhraseCycles, ...lanes.grouping.map(l => l.cycles)];
    state.fullPatternCycles = cycles.reduce((acc, c) => lcm(acc, c), 1);
}

/** Serializes grouping lanes for share/save. */
export function serializeGroupingLanes(serializeVoice) {
    if (!_deps) return [];
    return _deps.lanes.grouping.map(lane => ({
        g: lane.groupCount,
        c: lane.cycles,
        ph: lane.phase || 0,
        lk: lane.linked || null,
        v: lane.voices.map((voice, i) => serializeVoice(voice, lane.voiceChannels[i]))
    }));
}

/** Restores grouping lanes from a share/save payload. */
export function restoreGroupingLanes(data, applyVoiceState) {
    if (!_deps || !Array.isArray(data) || data.length === 0) return false;
    const { state, lanes, channels } = _deps;
    const valid = divisorsForGroups(state.mainTeeth);
    _nextId = 0;
    _colorCursor = 0;
    lanes.grouping = [];
    channels.groupingVoices = [];
    state.followPlayhead = { master: true };
    state.visibleCycle = { master: 0 };

    data.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        let groupCount = Number.isInteger(entry.g) ? entry.g : state.A;
        if (!valid.includes(groupCount)) groupCount = nearestValue(valid, groupCount);
        let cycles = Number.isInteger(entry.c) ? entry.c : 1;
        cycles = Math.max(1, Math.min(MAX_CYCLES, cycles));

        const lane = makeLane(state, { groupCount, cycles, linked: entry.lk || null });
        lane.phase = Number.isInteger(entry.ph) ? entry.ph : 0;
        normalizePhase(lane);
        lanes.grouping.push(lane);

        const voiceData = Array.isArray(entry.v) && entry.v.length ? entry.v : [{}];
        voiceData.forEach(vd => {
            const voice = addGroupingVoice(lane);
            if (!voice) return;
            voice.selected = new Array(lane.count()).fill(false);
            if (applyVoiceState) applyVoiceState(voice, lane, vd);
        });
    });

    if (!lanes.grouping.length) return false;
    ensureCycleKeys(_deps);
    buildGroupingLanes();
    return true;
}

