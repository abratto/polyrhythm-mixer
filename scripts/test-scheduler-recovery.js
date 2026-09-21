#!/usr/bin/env node
import assert from 'node:assert/strict';

import { startAudioScheduler, stopAudioScheduler, isGroupOnset } from './scheduler.js';

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
let scheduledTick = null;

globalThis.setTimeout = (callback) => {
    scheduledTick = callback;
    return 1;
};
globalThis.clearTimeout = () => {};

try {
    const audioCtx = { currentTime: 0 };
    const state = {
        audioClockActive: true,
        audioCtx,
        audioStartTime: 0,
        playing: true,
        tempo: 120,
        mainTeeth: 4,
        masterPhraseSteps: 4,
        phaseA: 0,
        phaseB: 0,
        teethA: 1,
        teethB: 1,
        followPlayhead: {},
        visibleCycle: {}
    };
    const lanes = {
        master: { voices: [] },
        grouping: [],
        Awheel: { selected: [] },
        Bwheel: { selected: [] }
    };
    const channels = { masterVoices: [], groupingVoices: [], Awheel: null, Bwheel: null, driver: null };

    startAudioScheduler(state, lanes, channels, 1);
    assert.ok(scheduledTick, 'Scheduler should queue its next tick.');

    audioCtx.currentTime = 100;
    scheduledTick();

    assert.equal(state.lastScheduledStep, 200, 'A long stall should reseed to the current master step.');
    assert.equal(state.lastScheduledQuarter, 200, 'A long stall should reseed to the current quarter.');
} finally {
    stopAudioScheduler();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
}

// Group onsets: a single-group lane (groupSize === frame) must still fire once
// per cycle — the active step is always 0, so onset detection is required.
{
    const frame = 12;
    const onsets = [];
    for (let s = 0; s < 24; s++) if (isGroupOnset(s, 0, frame)) onsets.push(s);
    assert.deepEqual(onsets, [0, 12], 'A single-group lane should fire once per cycle.');

    assert.equal(isGroupOnset(0, 0, 12), true, 'onset at cycle start');
    assert.equal(isGroupOnset(1, 0, 12), false, 'no onset mid-group');
    assert.equal(isGroupOnset(12, 0, 12), true, 'onset at the next cycle start');

    // A phase-shifted group of 3 (groupSize 4) starts on pulses 3, 7, 11.
    const shifted = [];
    for (let s = 0; s < 12; s++) if (isGroupOnset(s, 3, 4)) shifted.push(s);
    assert.deepEqual(shifted, [3, 7, 11], 'phase 3 of a 4-pulse group should land on 3, 7, 11.');
}

console.log('Scheduler recovery checks passed.');