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
            label: () => 'Master Cycle Pattern',
            description: () => `${state.masterPhraseSteps} steps / ${state.mainTeeth} teeth × ${state.masterPhraseCycles} ${state.masterPhraseCycles === 1 ? 'cycle' : 'cycles'}`,
            titleEl: ui.masterTitle,
            descriptionEl: ui.masterDescription,
            infoBtn: ui.masterInfoBtn,
            textForStep: i => (i % state.mainTeeth) + 1,
            boundary: i => (i % state.mainTeeth) % Math.max(1, Math.floor(state.mainTeeth / 4)) === 0,
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
            label: () => 'Meter A Phrase Pattern',
            description: () => `${state.phraseCyclesA} master cycle phrase • ${state.phraseStepsA} steps • clocked at ${masterRateLabelForMeter(state, state.A)} master rate`,
            titleEl: ui.titleAPhrase,
            descriptionEl: ui.aPhraseDescription,
            infoBtn: ui.aPhraseInfoBtn,
            textForStep: i => (i % state.A) + 1,
            boundary: i => i % state.A === 0,
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
    ensureGroupNudgeControl(lane);
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

/** Creates a single step button for a voice with click-to-toggle behavior. */
function createStepButton(lane, voice, i, actualIndex) {
    actualIndex = actualIndex ?? i;
    const btn = document.createElement('button');
    btn.className = `step-btn ${lane.className}`;
    btn.id = `${lane.stepId}-${i}`;
    btn.textContent = lane.textForStep(i);

    if (lane.boundary(i)) btn.classList.add('bar-boundary');
    if (voice.selected[actualIndex]) btn.classList.add('active');

    btn.addEventListener('click', () => {
        voice.selected[actualIndex] = !voice.selected[actualIndex];
        btn.classList.toggle('active', voice.selected[actualIndex]);
    });

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

    row.appendChild(labelArea);

    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column';

    const instrumentLabel = document.createElement('div');
    instrumentLabel.className = 'voice-instrument-label';
    instrumentLabel.textContent = voiceInstrumentLabel(voice);
    instrumentLabel.title = `Voice ${voiceIndex + 1} instrument: ${instrumentLabel.textContent}`;
    instrumentLabel.style.color = lane.color;
    stepsColumn.appendChild(instrumentLabel);

    // Step buttons container
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'voice-steps';

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
    stepsColumn.appendChild(stepsContainer);
    row.appendChild(stepsColumn);

    return row;
}

/** Refreshes displayed instrument labels without rebuilding step buttons. */
export function updateVoiceInstrumentLabels(lane) {
    if (!lane.isMultiVoice || !lane.container) return;

    lane.voices.forEach((voice, idx) => {
        const row = lane.container.querySelector(`.voice-row[data-voice-index="${idx}"]`);
        const label = row?.querySelector('.voice-instrument-label');
        if (!label) return;

        const labelText = voiceInstrumentLabel(voice);
        label.textContent = labelText;
        label.title = `Voice ${idx + 1} instrument: ${labelText}`;
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
export function buildLane(lane, state) {
    if (lane.isMultiVoice) {
        buildMultiVoiceLane(lane, state);
    } else {
        buildSingleLane(lane);
    }
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

function markMultiVoiceCurrentButtons(lane, state, previous, next) {
    const currentIndexes = Array.isArray(next) ? next : lane.voices.map(() => next);
    const totalCycles = lane.totalCycles?.() ?? 1;
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();

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
                }
            });
        }
    } else {
        const previousIndexes = Array.isArray(previous) ? previous : lane.voices.map(() => previous);

        lane.voices.forEach((voice, voiceIndex) => {
            removeCurrentClass(voice.buttons[previousIndexes[voiceIndex]]);
            addCurrentClass(voice.buttons[currentIndexes[voiceIndex]]);
        });
    }
}

function markSingleVoiceCurrentButtons(lane, previous, next) {
    removeCurrentClass(lane.buttons[previous]);
    addCurrentClass(lane.buttons[next]);
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
