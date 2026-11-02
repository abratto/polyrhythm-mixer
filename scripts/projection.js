/**
 * projection.js — Projects one voice's rhythm onto the visualizations.
 *
 * A projected voice is identified by its lane key plus voice index. Grouping
 * lanes use their cycleKey; the Master lane uses 'master'. The projected hits
 * are the voice's selected steps for the currently visible phrase cycle,
 * mapped onto master-pulse positions.
 */

let _state = null;
let _lanes = null;
let _ui = null;

export function laneProjectionKey(lane) {
    if (!lane) return '';
    if (lane.channelPrefix === 'master') return 'master';
    return lane.cycleKey || '';
}

export function projectionLabel(lane, voiceIndex) {
    if (!lane) return '';
    const laneLabel = lane.channelPrefix === 'master' ? 'Master' : `G${lane.groupCount}`;
    return `${laneLabel} V${voiceIndex + 1}`;
}

/** Angle of a projected rotating marker. With rotation = -tick*step, tick t
    reaches 12 o'clock exactly when its pulse fires. */
export function projectedRotationAngle(tick, mainTeeth, rotation) {
    return -Math.PI / 2 + (tick * 2 * Math.PI) / mainTeeth + rotation;
}

export function isVoiceProjected(state, lane, voiceIndex) {
    const ref = state.projectedVoice;
    return !!ref && ref.laneKey === laneProjectionKey(lane) && ref.voiceIndex === voiceIndex;
}

export function toggleProjection(state, lane, voiceIndex) {
    const key = laneProjectionKey(lane);
    if (!key) return null;
    state.projectedVoice = isVoiceProjected(state, lane, voiceIndex)
        ? null
        : { laneKey: key, voiceIndex };
    return state.projectedVoice;
}

/** Returns projected hit ticks (0..mainTeeth-1) for one voice. */
export function computeProjectedTicks(state, lane, voice) {
    const mainTeeth = state.mainTeeth;
    if (!mainTeeth || !Array.isArray(voice?.selected)) return [];

    const isMaster = lane.channelPrefix === 'master';
    const key = laneProjectionKey(lane);
    const totalCycles = Math.max(1, isMaster ? state.masterPhraseCycles : (lane.cycles || 1));
    const visibleCycle = Math.max(0, Math.min(totalCycles - 1, state.visibleCycle?.[key] || 0));
    const ticks = [];

    if (isMaster) {
        const start = visibleCycle * mainTeeth;
        const end = Math.min(voice.selected.length, start + mainTeeth);
        for (let i = start; i < end; i++) {
            if (voice.selected[i]) ticks.push(i % mainTeeth);
        }
    } else {
        const groupCount = lane.groupCount;
        if (!Number.isInteger(groupCount) || groupCount <= 0) return [];
        const groupSize = mainTeeth / groupCount;
        const phase = lane.phase || 0;
        const start = visibleCycle * groupCount;
        const end = Math.min(voice.selected.length, start + groupCount);
        for (let i = start; i < end; i++) {
            if (!voice.selected[i]) continue;
            let tick = Math.round(i * groupSize + phase) % mainTeeth;
            if (tick < 0) tick += mainTeeth;
            ticks.push(tick);
        }
    }

    return [...new Set(ticks)].sort((a, b) => a - b);
}

/** Resolves the current projection against the live lane list. */
export function getProjectedVoice(state, lanes) {
    const ref = state.projectedVoice;
    if (!ref) return null;
    const lane = ref.laneKey === 'master'
        ? lanes.master
        : (lanes.grouping || []).find(candidate => candidate.cycleKey === ref.laneKey);
    const voice = lane?.voices?.[ref.voiceIndex];
    if (!lane || !voice) {
        state.projectedVoice = null;
        return null;
    }
    const ticks = computeProjectedTicks(state, lane, voice);
    return {
        lane,
        voice,
        voiceIndex: ref.voiceIndex,
        key: ref.laneKey,
        ticks,
        tickSet: new Set(ticks),
        color: lane.color,
        label: projectionLabel(lane, ref.voiceIndex)
    };
}

export function initProjectionUI({ state, lanes, ui }) {
    _state = state;
    _lanes = lanes;
    _ui = ui;
    ui.vizProjectionClear?.addEventListener('click', () => {
        _state.projectedVoice = null;
        refreshProjectionUI();
    });
    refreshProjectionUI();
}

export function toggleProjectedVoice(lane, voiceIndex) {
    if (!_state) return;
    toggleProjection(_state, lane, voiceIndex);
    refreshProjectionUI();
}

export function clearProjectionForLane(lane) {
    if (!_state) return;
    if (_state.projectedVoice?.laneKey !== laneProjectionKey(lane)) return;
    _state.projectedVoice = null;
    refreshProjectionUI();
}

export function refreshProjectionUI() {
    if (!_state) return;
    const projected = getProjectedVoice(_state, _lanes);
    document.querySelectorAll('.voice-label[data-lane-key]').forEach((label) => {
        const active = !!projected &&
            label.dataset.laneKey === projected.key &&
            Number(label.dataset.voiceIndex) === projected.voiceIndex;
        label.classList.toggle('is-projected', active);
        label.setAttribute('aria-pressed', String(active));
        label.title = active
            ? 'Stop projecting this voice in the visualizations'
            : 'Project this voice in the visualizations';
    });

    if (_ui?.vizProjection) {
        _ui.vizProjection.hidden = !projected;
        if (projected) {
            _ui.vizProjectionName.textContent = projected.label;
            _ui.vizProjectionName.style.color = projected.color;
        }
    }
}
