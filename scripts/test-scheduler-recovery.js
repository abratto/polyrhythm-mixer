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

// Slow-tempo single-step scheduling. At 40 BPM with mainTeeth = 12 the step
// duration is 0.5 s — longer than the 0.25 s catch-up limit — so a catch-up
// test keyed only on elapsed time reseeds on EVERY normal single-step advance
// (setting lastScheduledStep = targetStep before the loop) and swallows every
// hit: the "silent below ~80 BPM" bug. A normal one-step advance must always
// schedule; only multi-step stalls may reseed.
{
    let tickFn = null;
    const originalSetTimeout2 = globalThis.setTimeout;
    globalThis.setTimeout = (cb) => { tickFn = cb; return 1; };
    globalThis.clearTimeout = () => {};

    try {
        const audioCtx = { currentTime: 0, destination: {} };
        const state = {
            audioClockActive: true,
            audioCtx,
            audioStartTime: 0,
            playing: true,
            tempo: 40,            // stepDuration = 0.5 s > MAX_CATCH_UP_SECONDS
            mainAngle: 0,
            mainTeeth: 12,
            masterPhraseSteps: 12,
            phaseA: 0,
            phaseB: 0,
            followPlayhead: { master: true },
            visibleCycle: { master: 0 }
        };
        const lanes = { master: { voices: [] }, grouping: [], Awheel: { selected: [] }, Bwheel: { selected: [] } };
        const channels = { masterVoices: [], Awheel: null, Bwheel: null, driver: null };

        startAudioScheduler(state, lanes, channels, 1);

        // One normal step advance (0.45 s < 0.5 s step). scheduleStepAudio sets
        // lastScheduledActive.master when it runs; -1 means the step was swallowed.
        audioCtx.currentTime = 0.45;
        tickFn();
        assert.equal(state.lastScheduledActive.master, 1,
            'A single step at a slow tempo must be scheduled, not swallowed by the catch-up reseed.');

        audioCtx.currentTime = 0.95;
        tickFn();
        assert.equal(state.lastScheduledActive.master, 2, 'Scheduling must keep advancing at slow tempo.');

        // A genuine multi-step stall (5 s = 10 steps) must still reseed and drop
        // the burst instead of collapsing it into one audible clump. The reseed
        // resets lastScheduledActive to { master: -1 } and jumps
        // lastScheduledStep straight to the target without scheduling the gap.
        audioCtx.currentTime += 5;
        tickFn();
        assert.equal(state.lastScheduledActive.master, -1,
            'A long stall must reseed without replaying the missed steps.');
        assert.equal(state.lastScheduledStep, 12,
            'The reseed must jump step tracking to the current clock position.');

        // …and scheduling resumes normally from the new position.
        audioCtx.currentTime += 0.45;
        tickFn();
        assert.equal(state.lastScheduledActive.master, 13 % 12,
            'Scheduling must resume after a stall reseed.');

        stopAudioScheduler();
    } finally {
        globalThis.setTimeout = originalSetTimeout2;
    }
}

console.log('Scheduler recovery checks passed.');