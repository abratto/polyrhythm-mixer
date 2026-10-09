/**
 * lane-ui.js — Sequencer lane rendering and interaction.
 *
 * Owns the fixed lane groups and the shared lane-building machinery:
 *   - master: the master wheel sequence (one step per tooth), multi-voice
 *   - master: the full-cycle phrase lane
 *   - grouping lanes: equal divisions of the master cycle (grouping-lanes.js)
 *
 * The dynamic Rhythm Tracks grouping lanes are built by grouping-lanes.js,
 * which reuses the multi-voice rendering here (`buildLane`). This module also
 * covers pattern editing, cycle navigation, the Master Beat reference strip,
 * rail collapse, mix dimming, and playhead marking.
 */
import { isOnQuarter, quarterBeatPeriod } from './math.js';
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
 * The pattern lives on the voice (`voice.selected`), shared by the buttons in
 * `voice.buttons`.
 */
function attachStepHandlers(btn, lane, voice, index) {
    const getArr = () => voice.selected;
    const getBtn = (i) => voice.buttons[i];
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
 *
 * The quarterBeatPeriod / isOnQuarter helpers live in math.js.
 */

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

/**
 * Creates the lane configuration objects. Multi-voice lanes (master and the
 * grouping lanes built by grouping-lanes.js) have a `voices` array; the
 * Multi-voice phrase lanes hold a voices[] array; see grouping-lanes.js.
 */
export function createLanes(ui, state) {
    return {
        master: {
            container: ui.masterGrid,
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
 *   - Master lane voices start empty
 *   - First step of the first master voice is enabled by default
 *   - Grouping lane defaults (including the canonical meter pulse on the
 *     linked A/B lanes) are owned by grouping-lanes.js.
 */
export function resetPatterns(state, lanes) {
    lanes.master.voices.forEach(v => {
        v.selected = new Array(state.masterPhraseSteps).fill(false);
        v.nudgeOffset = 0;
    });

    if (lanes.master.voices[0]?.selected.length > 0) lanes.master.voices[0].selected[0] = true;

    state.lastActive = { master: -1 };
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
    if (lanes.master.voices[0]?.selected.length > 0) lanes.master.voices[0].selected[0] = true;
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

/** Adds a new voice to a multi-voice lane. */
export function addVoice(lane) {
    if (!lane.isMultiVoice) return;
    const voice = createVoice();
    voice.selected = new Array(lane.count()).fill(false);
    lane.voices.push(voice);
}

/** Removes a voice from a multi-voice lane. Grouping lanes retain one voice. */
export function removeVoice(lane, index) {
    if (!lane.isMultiVoice || (lane.channelPrefix !== 'master' && lane.voices.length <= 1)) return;
    lane.voices.splice(index, 1);
}

/**
 * Applies beat/bar grouping classes to a step button for visual legibility.
 * A "beat" marks the start of a musical subdivision; a "bar" marks the start
 * of a full meter cycle (stronger divider). Rows alternate shading per beat
 * group so the eye can count groups at a glance.
 */
function applyGroupClasses(btn, lane, i) {
    // Overlay grouping lanes draw their beat/bar grid in the pulse underlay
    // (is-beat/is-bar cells), so the rectangles must stay clean — the global
    // step-beat/step-bar/step-alt accents would paint duplicate bars/tints.
    if (lane.groupingOverlay) return;

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
/**
 * Grouping cells draw one mini cell per pulse in the group so they visually
 * match the regular step-box language. The mini cell at the lane's offset marks
 * where the grouping starts. Lanes without a `stepSlices` hook are unaffected.
 *
 * Overlay-mode lanes (the current grouping lanes) skip the strip entirely: the
 * pulse position is read from the lane playhead sweeping the underlying pulse
 * boxes, and the offset is marked on the start pulse cell, so no inline strip is
 * drawn.
 */
function applyStepSlices(btn, lane) {
    if (lane.groupingOverlay) return;
    if (typeof lane.stepSlices !== 'function') return;
    const count = lane.stepSlices();
    // Skip huge subdivisions (small group counts) where segments would collapse.
    if (!Number.isInteger(count) || count < 2 || count > 24) return;
    btn.classList.add('has-slices');
    btn._stepSlices = [];
    btn.style.setProperty('--slice-count', String(count));

    // Keep the step index legible above the mini subdivision cells.
    const label = document.createElement('span');
    label.className = 'step-main-label';
    label.textContent = btn.textContent;
    btn.textContent = '';
    btn.appendChild(label);

    const phase = typeof lane.stepPhase === 'function' ? lane.stepPhase() : 0;
    const slices = document.createElement('span');
    slices.className = 'step-slices';
    for (let s = 0; s < count; s++) {
        const slice = document.createElement('span');
        slice.className = 'step-slice' + (s === phase ? ' start' : '');
        slices.appendChild(slice);
        btn._stepSlices.push(slice);
    }
    btn.appendChild(slices);
}

function createStepButton(lane, voice, i, actualIndex) {
    actualIndex = actualIndex ?? i;
    const btn = document.createElement('button');
    btn.className = `step-btn ${lane.className}`;
    btn.id = `${lane.stepId}-${i}`;
    btn.textContent = lane.textForStep(i);
    if (!lane.groupingOverlay && typeof lane.stepSlices === 'function') {
        const span = lane.stepSlices();
        if (Number.isInteger(span) && span > 0) {
            btn.style.setProperty('--step-span', String(span));
        }
    }
    applyStepSlices(btn, lane);

    applyGroupClasses(btn, lane, i);
    if (voice.selected[actualIndex]) btn.classList.add('active');

    attachStepHandlers(btn, lane, voice, actualIndex);

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
    label.dataset.compactLabel = String(voiceIndex + 1);
    label.style.color = lane.color;
    identityGroup.appendChild(label);

    // Per-voice instrument selector — sits next to the "Voice N" label in the
    // rail (top row, aligned with the step grid) to keep it associated with its
    // rhythm while reclaiming the horizontal space the inline cell used.
    const instrumentSelect = buildVoiceInstrumentSelect(lane, voice, voiceIndex);
    instrumentSelect.title = `Voice ${voiceIndex + 1} instrument`;
    const updateInstrumentTitle = () => {
        labelArea.title = `${label.textContent}: ${instrumentSelect.selectedOptions[0]?.textContent || 'instrument'}`;
    };
    updateInstrumentTitle();
    instrumentSelect.addEventListener('change', updateInstrumentTitle);
    identityGroup.appendChild(instrumentSelect);

    // Collapse/expand toggle for this voice's rail controls. Rendered first so
    // it reads as a disclosure triangle at the head of the row. Collapsed rails
    // retain instrument and Delete controls. New voices default to collapsed.
    if (voice.railCollapsed === undefined) voice.railCollapsed = true;
    const railToggle = document.createElement('button');
    railToggle.type = 'button';
    railToggle.className = 'rail-toggle-btn';
    let _railCollapsed = voice.railCollapsed;
    const syncRail = () => {
        voice.railCollapsed = _railCollapsed;
        railToggle.textContent = _railCollapsed ? '▸' : '▾';
        railToggle.title = _railCollapsed ? 'Expand voice controls' : 'Collapse voice controls';
        railToggle.setAttribute('aria-expanded', String(!_railCollapsed));
        labelArea.classList.toggle('rail-collapsed', _railCollapsed);
    };
    const setRailCollapsed = (val) => { _railCollapsed = !!val; syncRail(); };
    syncRail();
    railToggle.addEventListener('click', () => {
        _railCollapsed = !_railCollapsed;
        syncRail();
    });
    identityGroup.insertBefore(railToggle, identityGroup.firstChild);
    lane._voiceRailCtrls.push(setRailCollapsed);

    // Channels linked after rendering mount the same expanded mix controls.
    let headSoloMuteControls = null;
    let clrBtn = null;
    let removeBtn = null;

    if (voiceIndex > 0 || lane.channelPrefix === 'master') {
        removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-voice-btn';
        removeBtn.title = `Remove Voice ${voiceIndex + 1}`;
        removeBtn.addEventListener('click', () => {
            removeVoice(lane, voiceIndex);
            if (lane.onRemoveVoice) {
                lane.onRemoveVoice(voiceIndex);
            }
            buildMultiVoiceLane(lane, state);
        });
    } else if (lane._removeTrackButton) {
        removeBtn = lane._removeTrackButton;
    }
    if (removeBtn) {
        removeBtn.textContent = 'X';
        removeBtn.classList.add('compact-delete-btn');
        removeBtn.setAttribute('aria-label', removeBtn.title);
        const deleteControls = document.createElement('div');
        deleteControls.className = 'head-mix-controls';
        deleteControls.appendChild(removeBtn);
        identityGroup.appendChild(deleteControls);
    }

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
    const editControls = createVoiceEditControls(lane, voiceIndex, state);

    // Solo/Mute/Clear are revealed with volume; Delete stays in the header.
    const mountSoloMute = (channel) => {
        const controls = createSoloMuteControls(channel, `solo_${lane.channelPrefix}_${voiceIndex}`, `mute_${lane.channelPrefix}_${voiceIndex}`, { compact: true });
        controls.classList.add('expanded-mix-actions');
        mixGroup.appendChild(controls);
        headSoloMuteControls = controls;
        if (clrBtn) controls.appendChild(clrBtn);
        return controls;
    };

    // Per-voice volume fader — own row in the mixer sub-panel.
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
        vol.setAttribute('aria-label', `Voice ${voiceIndex + 1} volume`);
        voice.channel.volEl = vol;
        vol.addEventListener('input', () => { voice.channel.volume = parseFloat(vol.value); });
        mixGroup.insertBefore(volWrap, mixGroup.firstChild);
    }

    // Clear remains available alongside Solo/Mute in the expanded mix controls.
    clrBtn = document.createElement('button');
    clrBtn.type = 'button';
    clrBtn.className = 'edit-btn edit-btn-sm compact-clear-btn';
    clrBtn.textContent = 'C';
    clrBtn.title = `Clear voice ${voiceIndex + 1}`;
    clrBtn.setAttribute('aria-label', clrBtn.title);
    clrBtn.addEventListener('click', () => clearVoice(lane, lane.voices[voiceIndex], state));
    mixGroup.appendChild(clrBtn);
    if (voice.channel) mountSoloMute(voice.channel);

    // Assemble pattern group (edit ops + nudge).
    if (editControls) patternGroup.appendChild(editControls);
    if (nudgeControl) patternGroup.appendChild(nudgeControl);

    // Track-level controls for a multi-voice lane (currently the grouping lanes'
    // Grouping / Phrase Length / Offset) mount into the first voice's
    // collapsible rail sub-row so they stay contextually attached to the lane.
    const trackGroup = document.createElement('div');
    trackGroup.className = 'voice-control-group track-group';
    if (voiceIndex === 0 && typeof lane._mountGroupControls === 'function') {
        lane._mountGroupControls(trackGroup);
    }
    for (const [group, title] of [[mixGroup, 'Sound'], [patternGroup, 'Pattern'], [trackGroup, 'Track timing']]) {
        if (!group.childElementCount) continue;
        const heading = document.createElement('span');
        heading.className = 'voice-controls-heading';
        heading.textContent = title;
        group.prepend(heading);
    }

    // Grouping navigation stays inside its first voice's expandable control area.
    if (voiceIndex === 0 && lane._headerViewControls) {
        lane._headerViewControls.classList.add('lane-header-view-actions');
    }

    labelArea.append(identityGroup, mixGroup, patternGroup);
    if (trackGroup.childElementCount) labelArea.appendChild(trackGroup);
    if (trackGroup.childElementCount && patternGroup.childElementCount) {
        const panelSwitch = document.createElement('div');
        panelSwitch.className = 'voice-panel-switch';
        panelSwitch.setAttribute('role', 'group');
        panelSwitch.setAttribute('aria-label', 'Voice editing section');
        const buttons = [];
        const selectPanel = (panel) => {
            voice.controlPanel = panel;
            labelArea.dataset.controlPanel = panel;
            buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === panel)));
        };
        for (const [panel, title, target] of [['pattern', 'Pattern', patternGroup], ['timing', 'Timing', trackGroup]]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = title;
            button.dataset.panel = panel;
            target.id = `${lane.channelPrefix}_${voiceIndex}_${panel}_controls`;
            button.setAttribute('aria-controls', target.id);
            button.addEventListener('click', () => selectPanel(panel));
            buttons.push(button);
            panelSwitch.appendChild(button);
        }
        selectPanel(voice.controlPanel === 'timing' ? 'timing' : 'pattern');
        labelArea.insertBefore(panelSwitch, patternGroup);
    }
    if (voiceIndex === 0 && lane._headerViewControls) {
        labelArea.insertBefore(lane._headerViewControls, mixGroup);
    }
    if (voice.railCollapsed) labelArea.classList.add('rail-collapsed');
    row.appendChild(labelArea);

    // Mount mix actions for channels linked after rendering (share-load / add-voice).
    voice._mountHeadMix = (channel) => {
        if (headSoloMuteControls) return headSoloMuteControls;
        return mountSoloMute(channel);
    };

    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column';

    // Step buttons container
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'voice-steps';
    stepsContainer.style.position = 'relative';
    if (lane.groupingOverlay && Number.isInteger(state?.mainTeeth) && state.mainTeeth > 0) {
        stepsContainer.classList.add('grouping-overlay-mode');
    }
    if (!lane.groupingOverlay && typeof lane.stepSlices === 'function' && Number.isInteger(state?.mainTeeth) && state.mainTeeth > 0) {
        stepsContainer.classList.add('grouping-grid');
    }

    let stepsMount = stepsContainer;
    if (lane.groupingOverlay && Number.isInteger(state?.mainTeeth) && state.mainTeeth > 0) {
        const underlay = document.createElement('div');
        underlay.className = 'grouping-underlay-grid';
        const groupSize = typeof lane.stepSlices === 'function' ? lane.stepSlices() : 1;
        stepsContainer.dataset.groupSize = String(groupSize);
        const phase = typeof lane.stepPhase === 'function' ? lane.stepPhase() : 0;
        const markStart = Number.isInteger(groupSize) && groupSize >= 2
            && Number.isInteger(phase) && phase >= 0 && phase < groupSize;
        for (let i = 0; i < state.mainTeeth; i++) {
            const cell = document.createElement('span');
            cell.className = 'grouping-underlay-cell';
            if (i === 0) cell.classList.add('is-bar');
            else if (isOnQuarter(i, state.mainTeeth)) cell.classList.add('is-beat');
            // The grouping's start pulse (offset) gets a marker on the pulse box,
            // always labelled "1": it marks where the grouping's own "1" falls.
            // Nudging the offset slides the marker to another subdivision without
            // changing the number, so the count stays meaningful as "the one".
            if (markStart && i % groupSize === phase) {
                cell.classList.add('is-start');
                cell.textContent = '1';
            }
            underlay.appendChild(cell);
        }
        stepsContainer.appendChild(underlay);

        const overlay = document.createElement('div');
        overlay.className = 'grouping-overlay-grid';
        stepsContainer.appendChild(overlay);
        stepsMount = overlay;
    }

    const totalCycles = lane.totalCycles?.() ?? 1;
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    const visibleCycle = totalCycles > 1 ? (lane._visibleCycle ?? 0) : 0;
    const cycleStart = visibleCycle * stepsPerCycle;

    voice.buttons = [];
    for (let i = 0; i < stepsPerCycle; i++) {
        const actualIndex = totalCycles > 1 ? cycleStart + i : i;
        const btn = createStepButton(lane, voice, i, actualIndex);
        if (lane.groupingOverlay && typeof lane.stepSlices === 'function') {
            const span = lane.stepSlices();
            if (Number.isInteger(span) && span > 0) {
                btn.style.setProperty('--step-span', String(span));
            }
        }
        stepsMount.appendChild(btn);
        voice.buttons.push(btn);
    }

    // Single playhead column overlay for the lane. All voices in a lane share
    // the same step position, so only the first voice carries the playhead —
    // one bar for the lane instead of one per voice row.
    if (voiceIndex === 0) {
        const playhead = document.createElement('div');
        playhead.className = 'lane-playhead';
        playhead.setAttribute('aria-hidden', 'true');
        stepsMount.appendChild(playhead);
        lane._playheads = lane._playheads || [];
        lane._playheads.push(playhead);
    }

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

/** State key for a lane's cycle window: grouping lanes carry their own key,
    the fixed multi-voice lane is the master. */
function cycleNavKey(lane) {
    return lane.cycleKey || 'master';
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

    const laneKey = cycleNavKey(lane);
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
            attachStepHandlers(btn, lane, voice, actualIndex);
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
    const laneKey = cycleNavKey(lane);
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
    const laneKey = cycleNavKey(lane);
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
    const usesHeaderMount = typeof lane._mountHeaderViewControls === 'function';
    if (!viewActions && !usesHeaderMount) return;

    if (viewActions) {
        const existing = viewActions.querySelector('.cycle-nav');
        if (existing) existing.remove();
    }

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
    // Prefer the row header (identity group) when the lane provides a mount hook
    // — grouping lanes put cycle nav + help next to the voice picker / S / M so
    // the lane needs no separate toolbar row. Otherwise fall back to the toolbar.
    if (usesHeaderMount) {
        // The header container persists across rebuilds, so drop any previously
        // mounted cycle nav first — otherwise each rebuild appends a duplicate.
        const staleNav = lane._headerViewControls?.querySelector('.cycle-nav');
        if (staleNav) staleNav.remove();
        lane._mountHeaderViewControls(nav);
        return;
    }
    if (!viewActions) return;
    const infoBtn = viewActions.querySelector('.lane-info-btn');
    if (infoBtn) {
        viewActions.insertBefore(nav, infoBtn);
    } else {
        viewActions.appendChild(nav);
    }
}

/**
 * Grouping-overlay lanes wrap at group boundaries: each row holds a whole
 * number of groups, so a group's pulse substeps never straddle a row break and
 * the pulse underlay and group-button overlay share identical tracks. The
 * per-row column count depends on the lane width, so it is measured and written
 * to the wrapper's `--group-template`; a ResizeObserver keeps it in sync.
 */
let _groupingWrapObserver = null;

function layoutGroupingWrap(wrap) {
    const groupSize = Number(wrap.dataset.groupSize);
    if (!Number.isInteger(groupSize) || groupSize < 1) return;
    const underlay = wrap.querySelector('.grouping-underlay-grid');
    const width = wrap.clientWidth;
    if (!underlay || width <= 0) return;
    const cs = getComputedStyle(underlay);
    const stepSize = parseFloat(cs.getPropertyValue('--step-size')) || 30;
    const gap = parseFloat(cs.columnGap) || 4;
    // Width of one group (its pulses + internal gaps) plus the gap before the
    // next group; fit as many whole groups per row as the lane allows, but
    // never more than exist (so a sparse lane's cells still fill the width
    // instead of leaving empty tracks at the right edge).
    const totalGroups = Math.max(1, Math.ceil(underlay.children.length / groupSize));
    const perGroup = groupSize * stepSize + (groupSize - 1) * gap;
    const groupsPerRow = Math.min(totalGroups, Math.max(1, Math.floor((width + gap) / (perGroup + gap))));
    const template = `repeat(${groupsPerRow * groupSize}, minmax(${stepSize}px, 1fr))`;
    if (wrap._groupTemplate !== template) {
        wrap._groupTemplate = template;
        wrap.style.setProperty('--group-template', template);
    }
}

function observeGroupingWrap(wrap) {
    if (typeof ResizeObserver === 'undefined') return;
    if (!_groupingWrapObserver) {
        _groupingWrapObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const target = entry.target;
                if (!target.isConnected) {
                    _groupingWrapObserver.unobserve(target);
                    continue;
                }
                layoutGroupingWrap(target);
            }
        });
    }
    _groupingWrapObserver.observe(wrap);
}

/** Stops observing a lane's grouping wrappers before its DOM is rebuilt. */
function unobserveGroupingWraps(container) {
    if (!_groupingWrapObserver || !container) return;
    container.querySelectorAll('.grouping-overlay-mode').forEach((wrap) => {
        _groupingWrapObserver.unobserve(wrap);
    });
}

/** Builds all voice rows for a multi-voice lane. */
function buildMultiVoiceLane(lane, state) {
    const activeSelect = document.activeElement;
    const activeSelectId = (activeSelect && activeSelect.tagName === 'SELECT' && lane.container.contains(activeSelect)) ? activeSelect.id : null;
    unobserveGroupingWraps(lane.container);
    lane.container.innerHTML = '';
    lane.container.style.position = 'relative';
    lane._playheads = [];
    lane._voiceRailCtrls = [];
    updateLaneHeader(lane, state);

    if (state) {
        addCycleNavigation(lane, state);
    }

    if (state) {
        lane._visibleCycle = state?.visibleCycle?.[cycleNavKey(lane)] ?? 0;
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

    // Grouping lanes wrap at group boundaries; measure each row now that it is
    // in the DOM and keep it in sync on resize.
    if (lane.groupingOverlay) {
        lane.container.querySelectorAll('.grouping-overlay-mode').forEach((wrap) => {
            layoutGroupingWrap(wrap);
            observeGroupingWrap(wrap);
        });
    }

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
let _mbWakeTimer = null;
let _mbLastQuarter = null;
let _mbLastHit = null;

function formatMasterBeatSubtitle(mainTeeth) {
    const pulsesPerBeat = mainTeeth / 4;
    if (Number.isInteger(pulsesPerBeat)) {
        return `4/4 reference · 4 equal beats of ${pulsesPerBeat} pulse${pulsesPerBeat === 1 ? '' : 's'} each`;
    }
    const decimal = pulsesPerBeat.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `4/4 reference · 4 equal beats across ${mainTeeth} pulses (${decimal} pulses per beat)`;
}

function buildMasterBeatReference(lane, state) {
    // The Master Beat rail (#masterBeatControls) holds the label/instrument/volume/
    // solo/mute; this returns only the reference step grid to sit beside it.
    const stepsColumn = document.createElement('div');
    stepsColumn.className = 'voice-steps-column master-beat-grid';
    const steps = document.createElement('div');
    steps.className = 'voice-steps master-beat-steps';

    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    // The Master Beat is a single-measure 4/4 reference: it always shows one
    // cycle of pulse teeth plus four quarter beats, regardless of how many
    // cycles the master phrase spans. Rendering every cycle made the strip
    // overflow/scroll and the 1-2-3-4 beat flash stop animating cleanly.
    const totalCycles = 1;
    const total = stepsPerCycle;
    const mainTeeth = state.mainTeeth;

    const subtitle = document.querySelector('#masterBeatControls .master-beat-sub');
    if (subtitle) subtitle.textContent = formatMasterBeatSubtitle(mainTeeth);

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
    if (_mbWakeTimer) clearTimeout(_mbWakeTimer);
    _mbBeatRAF = null;
    _mbBeatTimer = null;
    _mbWakeTimer = null;
    _mbLastQuarter = null;
    _mbLastHit = null;
    // Resolve the bands and cycle count once: the strip is static between
    // rebuilds, so the animation loop must not re-query the DOM every frame.
    const bands = steps.querySelectorAll('.mb-quarter');
    const totalCycleCount = Number(steps.dataset.totalCycles) || 1;
    _mbBeatRAF = requestAnimationFrame(() => animateMasterBeatQuarters(state, bands, totalCycleCount));

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
 *
 * The bands NodeList is resolved once per strip build (see buildMasterBeatReference),
 * and while the transport is stopped the loop idles on a 250ms wake instead of
 * spinning at display refresh rate — mirroring the canvas loop's idle pattern.
 */
function animateMasterBeatQuarters(state, bands, totalCycles) {
    if (bands.length && state.playing) {
        const currentQuarter = Math.floor((state.mainAngle || 0) / (Math.PI / 2));
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
        _mbBeatRAF = requestAnimationFrame(() => animateMasterBeatQuarters(state, bands, totalCycles));
    } else {
        // Stopped (or no bands): track the frozen quarter, then idle — the
        // wake re-enters at display rate as soon as playback resumes.
        if (bands.length) _mbLastQuarter = Math.floor((state.mainAngle || 0) / (Math.PI / 2));
        _mbWakeTimer = setTimeout(() => {
            _mbWakeTimer = null;
            _mbBeatRAF = requestAnimationFrame(() => animateMasterBeatQuarters(state, bands, totalCycles));
        }, 250);
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
    identityGroup.insertBefore(toggle, identityGroup.firstChild);
    return toggle;
}

/** Controllers for the static pulse-section rails, populated by wirePulseRailCollapses. */
const _pulseRailControllers = [];

/** Wires collapse toggles onto the static pulse-section rails. */
export function wirePulseRailCollapses({ defaultCollapsed = true } = {}) {
    const defs = [
        // The Master Beat 4/4 click-track rail: collapsing hides its controls.
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

// Every collapsible left-rail control (pulse-section rails + per-voice phrase
// rails) registers a setCollapsed(fn) here so a single "Expand all / Collapse
// all" action can drive them. Voice-rail controllers are stored per-lane
// (lane._voiceRailCtrls) and reset on each lane rebuild, so the registry never
// holds stale closures after the dynamic phrase lanes are re-rendered.
let _railLanes = null;

/** Captures the lanes map so setAllRailsCollapsed can reach every voice rail. */
export function registerRailLanes(lanes) {
    _railLanes = lanes;
}

/** Expands (val = false) or collapses (val = true) every collapsible rail. */
export function setAllRailsCollapsed(val) {
    _pulseRailControllers.forEach(set => set(val));
    if (_railLanes) {
        const laneList = [_railLanes.master, ...(_railLanes.grouping || [])];
        laneList.forEach(lane => {
            (lane?._voiceRailCtrls || []).forEach(set => set(val));
        });
    }
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
    (lanes.grouping || []).forEach(lane => reflectLaneMix(lane));
}

/**
 * Rebuilds the fixed lanes' DOM buttons. Grouping lanes are rebuilt by
 * grouping-lanes.js (which also owns their offset row), so they are excluded
 * here — otherwise a rebuild would wipe the offset row.
 */
export function buildAllLanes(lanes, state) {
    registerRailLanes(lanes);
    buildLane(lanes.master, state);
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
function randomizeLane(lane, state) {
    if (lane.isMultiVoice) {
        lane.voices.forEach(v => {
            for (let i = 0; i < v.selected.length; i++) v.selected[i] = Math.random() < 0.4;
        });
    } else {
        for (let i = 0; i < lane.selected.length; i++) lane.selected[i] = Math.random() < 0.4;
    }
    buildLane(lane, state);
}

/** Reverses every voice's pattern in place. */
function reverseLane(lane, state) {
    if (lane.isMultiVoice) lane.voices.forEach(v => v.selected.reverse());
    else lane.selected.reverse();
    buildLane(lane, state);
}

/** Replaces a single voice's pattern with a random one (~40% density). */
function randomizeVoice(lane, voice, state) {
    for (let i = 0; i < voice.selected.length; i++) voice.selected[i] = Math.random() < 0.4;
    buildLane(lane, state);
}

/** Reverses a single voice's pattern in place. */
function reverseVoice(lane, voice, state) {
    voice.selected.reverse();
    buildLane(lane, state);
}

/** Clears a single voice's pattern (all steps off). */
function clearVoice(lane, voice, state) {
    voice.selected.fill(false);
    buildLane(lane, state);
}

/** Single-voice clipboard for per-voice copy/paste. */
let _voiceClipboard = null;

function copyVoice(voice) {
    _voiceClipboard = [...voice.selected];
}

function pasteVoice(lane, voice, state) {
    if (!_voiceClipboard) return;
    const dst = voice.selected;
    const len = Math.min(_voiceClipboard.length, dst.length);
    for (let i = 0; i < len; i++) dst[i] = _voiceClipboard[i];
    buildLane(lane, state);
}

/**
 * Builds the per-voice Copy/Paste controls shown inside each multi-voice row,
 * so a single voice can be copied and pasted into another voice (same lane or
 * a different lane).
 */
function createVoiceEditControls(lane, voiceIndex, state) {
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
        mk('Random', `Randomize voice ${voiceIndex + 1}`, () => randomizeVoice(lane, lane.voices[voiceIndex], state)),
        mk('Reverse', `Reverse voice ${voiceIndex + 1}`, () => reverseVoice(lane, lane.voices[voiceIndex], state)),
        mk('Copy', `Copy voice ${voiceIndex + 1}`, () => copyVoice(lane.voices[voiceIndex])),
        mk('Paste', `Paste into voice ${voiceIndex + 1}`, () => pasteVoice(lane, lane.voices[voiceIndex], state))
    );
    return group;
}

/**
 * Adds per-lane editing buttons (Randomize / Reverse / Copy / Paste) to the
 * lane toolbar. Called once per lane during initialization.
 */
export function addLaneEditControls(lane, state) {
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
        mkBtn('Random', `Randomize ${name}`, () => randomizeLane(lane, state)),
        mkBtn('Reverse', `Reverse ${name}`, () => reverseLane(lane, state))
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
function createSoloMuteControls(channel, idSolo, idMute, { solo = true, compact = false } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'voice-mix-controls';
    // Compact buttons render as one-letter M/S while keeping the full
    // word in the accessible name / title.
    const soloText = (on) => compact ? 'S' : (on ? 'Soloed' : 'Solo');
    const muteText = (on) => compact ? 'M' : (on ? 'Muted' : 'Mute');

    let soloBtn = null;
    if (solo) {
        soloBtn = document.createElement('button');
        soloBtn.type = 'button';
        soloBtn.className = 'solo-btn';
        soloBtn.id = idSolo;
        soloBtn.textContent = soloText(channel.soloed);
        soloBtn.setAttribute('aria-label', 'Solo');
        soloBtn.title = 'Solo';
    }

    const mute = document.createElement('button');
    mute.type = 'button';
    mute.className = 'mute-btn';
    mute.id = idMute;
    mute.textContent = muteText(channel.muted);
    mute.setAttribute('aria-label', 'Mute');
    mute.title = 'Mute';

    if (compact) wrap.classList.add('compact-mix-controls');
    if (soloBtn) wrap.append(soloBtn);
    wrap.append(mute);
    if (soloBtn) channel.soloEl = soloBtn;
    channel.muteEl = mute;
    bindSoloMute(channel, _mixChannels, { soloText, muteText });
    return wrap;
}

/**
 * Mounts Solo/Mute for the master wheel's `driver` channel in the Master Beat
 * rail. Multi-voice lanes get theirs per voice inside buildVoiceButtons.
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

    // 'driver' is the master wheel (the Master Beat reference). Its instrument,
    // volume, and solo/mute are colocated in the Master Beat rail.
    const beatControls = document.getElementById('masterBeatControls');
    if (beatControls && channels.driver) {
        const mixGroup = beatControls.querySelector('.mix-group');
        if (mixGroup && !beatControls.querySelector('#soloDriver')) {
            const controls = createSoloMuteControls(channels.driver, 'soloDriver', 'muteDriver', { compact: true });
            controls.classList.add('expanded-mix-actions');
            mixGroup.appendChild(controls);
        }
    }

    // Reorder master lane toolbar controls: Random/Reverse, Clear, Nudge Group
    // (+ Voice is now pinned to the bottom of the lane, below the voice rows).
    reorderWheelLaneControls(mountFor(lanes.master), ['.lane-edit-controls', 'clearMasterBtn', '.group-nudge-control']);
}

    function reorderWheelLaneControls(mount, selectors) {
        if (!mount) return;
        selectors.forEach((sel) => {
            const el = sel.startsWith('.') ? mount.querySelector(sel) : document.getElementById(sel);
            if (el) mount.appendChild(el);
        });
    }

/** The rendered grid cells a playhead measures against: overlay grouping
    lanes draw their pulse cells in a sibling underlay grid (the playhead lives
    in the group-button layer above it), while every other lane's cells are its
    own grid children. Returns a live HTMLCollection, or null when unhosted. */
function playheadCells(overlay) {
    const host = overlay.parentElement;
    if (!host) return null;
    const underlay = host.previousElementSibling;
    if (underlay && underlay.classList && underlay.classList.contains('grouping-underlay-grid')) {
        return underlay.children;
    }
    return host.children;
}

/**
 * Moves a lane's playhead column overlay to the given visible step index.
 *
 * The column is aligned to the rendered grid cell it marks rather than to a
 * fraction of the container width. Measuring the cell keeps the playhead exact
 * across the grid's column gap and, for a dense lane that wraps onto extra
 * rows, across rows as well — the column follows its cell onto the correct row
 * instead of being hidden.
 *
 * Writes are limited to compositor-only properties: a translate plus a size,
 * each written only when it changes.
 */
function positionPlayhead(overlay, displayedIndex, stepsPerCycle) {
    if (!overlay) return;
    const host = overlay.parentElement;
    const cells = playheadCells(overlay);
    const cell = cells ? cells[displayedIndex] : null;
    if (displayedIndex < 0 || displayedIndex >= stepsPerCycle || !host || !cell || cell === overlay) {
        if (overlay.style.opacity !== '0') overlay.style.opacity = '0';
        return;
    }

    // Measure the cell against the overlay's own grid box; the scroll offset
    // of the shared scrolling ancestor cancels out of the difference once
    // host.scrollLeft/scrollTop are added back (host is itself the scroller
    // for the non-overlay lanes).
    const hostRect = host.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const x = cellRect.left - hostRect.left + host.scrollLeft - host.clientLeft;
    const y = cellRect.top - hostRect.top + host.scrollTop - host.clientTop;
    const w = cellRect.width;
    const h = cellRect.height;

    if (overlay.style.opacity !== '1') overlay.style.opacity = '1';

    // The column carries a decorative border; border-box keeps its outer edge
    // flush with the cell instead of overshooting by the border width. It is
    // placed per cell, so it no longer stretches between the grid's edges.
    if (!overlay._boxSized) {
        overlay._boxSized = true;
        overlay.style.boxSizing = 'border-box';
        overlay.style.top = '0';
        overlay.style.bottom = 'auto';
    }

    if (overlay._lastW !== w) {
        overlay._lastW = w;
        overlay.style.width = w + 'px';
    }
    if (overlay._lastH !== h) {
        overlay._lastH = h;
        overlay.style.height = h + 'px';
    }
    const xf = x.toFixed(1);
    const yf = y.toFixed(1);
    if (overlay._lastX !== xf || overlay._lastY !== yf) {
        overlay._lastX = xf;
        overlay._lastY = yf;
        // Clear any percentage fallback so the base `left` stays at 0 and the
        // transform is the sole offset.
        if (overlay.style.left) overlay.style.left = '0';
        overlay.style.transform = `translate(${xf}px, ${yf}px)`;
    }
}

// Follow-playhead state for over-long scrollable sequences. When on, the view
// tracks the active step (Ableton-style). Scrolling a lane manually disables
// follow; the transport-bar "Follow" toggle re-enables it.
let _followScroll = true;
let _followChangeListener = null;

/** Sets follow mode and notifies the transport-bar toggle of the new state. */
export function setScrollFollow(value) {
    const v = !!value;
    if (_followScroll === v) return;
    _followScroll = v;
    if (_followChangeListener) _followChangeListener(v);
}

/** Returns whether follow-playhead mode is currently enabled. */
export function isScrollFollow() {
    return _followScroll;
}

/** Registers a listener invoked whenever follow mode toggles (on or off). */
export function onScrollFollowChange(fn) {
    _followChangeListener = fn;
}

/**
 * Paged follow-playhead: keeps the view on a fixed page (one viewport of
 * steps) while the playhead sweeps left-to-right through it, then flips a
 * full page when the active step crosses the right edge (hardware step-grid
 * style). A no-op when follow is off or the whole row already fits. The last
 * page clamps to the sequence end, and a loop wrap returns to page 0.
 *
 * DOM work (two getBoundingClientRect reads + a scrollLeft write, all of
 which force layout) happens only when the target page differs from the
 last page applied to that scroller — the common case is the playhead
 moving within the current page, which costs nothing.
 */
const _lastPageByScroller = new WeakMap();

// Caches whether each step scroller actually overflows. Reading
// clientWidth/scrollWidth forces a synchronous layout, and this runs once per
// voice on every step change — so with many grouping lanes it can thrash
// layout on low-end devices. The result is cached per scroller and invalidated
// on window resize (a rebuild produces fresh scroller elements, which simply
// get measured once on first use).
let _scrollOverflowCache = new WeakMap();
if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => { _scrollOverflowCache = new WeakMap(); });
}

function scrollerOverflows(scroller) {
    let overflows = _scrollOverflowCache.get(scroller);
    if (overflows === undefined) {
        overflows = scroller.scrollWidth > scroller.clientWidth;
        _scrollOverflowCache.set(scroller, overflows);
    }
    return overflows;
}

function revealStepInView(btn) {
    if (!_followScroll || !btn) return;
    const scroller = btn.closest('.voice-steps, .sequencer-container');
    if (!scroller) return;
    if (!scrollerOverflows(scroller)) return;
    const clientWidth = scroller.clientWidth;
    const sRect = scroller.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const scrollLeft = scroller.scrollLeft;
    const bLeft = bRect.left - sRect.left + scrollLeft;
    const page = Math.max(0, Math.floor(bLeft / clientWidth));
    if (_lastPageByScroller.get(scroller) === page) return;
    const max = scroller.scrollWidth - clientWidth;
    const clamped = Math.min(page * clientWidth, max);
    if (Math.abs(scroller.scrollLeft - clamped) < 1) {
        _lastPageByScroller.set(scroller, page);
        return;
    }
    scroller.scrollLeft = clamped;
    _lastPageByScroller.set(scroller, page);
}

function markMultiVoiceCurrentButtons(lane, state, previous, next) {
    const currentIndexes = Array.isArray(next) ? next : lane.voices.map(() => next);
    const totalCycles = lane.totalCycles?.() ?? 1;
    const stepsPerCycle = lane.stepsPerCycle?.() ?? lane.count();
    const masterStep = state?.lastActive?.masterStep;
    // Overlay grouping lanes sweep the playhead across the underlying master
    // pulse boxes (one column per pulse) instead of one column per group box.
    const overlayPulses = lane.groupingOverlay && Number.isInteger(state?.mainTeeth) && state.mainTeeth > 0
        ? state.mainTeeth
        : 0;
    const pulseIndex = overlayPulses > 0 && Number.isFinite(masterStep)
        ? ((masterStep % overlayPulses) + overlayPulses) % overlayPulses
        : null;

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
                    if (pulseIndex != null) positionPlayhead(lane._playheads?.[voiceIndex], pulseIndex, overlayPulses);
                    else positionPlayhead(lane._playheads?.[voiceIndex], displayedCurr, stepsPerCycle);
                    revealStepInView(voice.buttons[displayedCurr]);
                } else {
                    if (pulseIndex != null) positionPlayhead(lane._playheads?.[voiceIndex], pulseIndex, overlayPulses);
                }
            } else {
                // Pinned: the highlight loops the pinned cycle continuously,
                // mirroring the audio gate in scheduleStepAudio (both wrap the
                // global step index modulo the cycle length). Without the wrap
                // the highlight only lit while the master playhead happened to
                // sweep through the pinned cycle, going dark for the rest of the
                // phrase. Highlighting is position-driven, so it also shows the
                // frozen position while the transport is stopped.
                const local = ((currentIndexes[voiceIndex] % stepsPerCycle) + stepsPerCycle) % stepsPerCycle;
                addCurrentClass(voice.buttons[local]);
                voice._currentIndex = local;
                if (pulseIndex != null) positionPlayhead(lane._playheads?.[voiceIndex], pulseIndex, overlayPulses);
                else positionPlayhead(lane._playheads?.[voiceIndex], local, stepsPerCycle);
                revealStepInView(voice.buttons[local]);
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
            if (pulseIndex != null) positionPlayhead(lane._playheads?.[voiceIndex], pulseIndex, overlayPulses);
            else positionPlayhead(lane._playheads?.[voiceIndex], currentIndexes[voiceIndex], stepsPerCycle);
            revealStepInView(voice.buttons[currentIndexes[voiceIndex]]);
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
        revealStepInView(lane.buttons[pulse]);
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
        ...(lanes.grouping || []).map(lane => [lane.cycleKey, lane, active[lane.cycleKey]])
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
