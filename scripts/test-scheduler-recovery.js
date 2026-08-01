#!/usr/bin/env node
import assert from 'node:assert/strict';

import { startAudioScheduler, stopAudioScheduler } from './scheduler.js';

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
        phraseStepsA: 4,
        phraseStepsB: 4
    };
    const lanes = {
        master: { voices: [] },
        Aphrase: { voices: [] },
        Awheel: { selected: [] },
        Bphrase: { voices: [] },
        Bwheel: { selected: [] }
    };
    const channels = { masterVoices: [], Avoices: [], A: null, Bvoices: [], Awheel: null, Bwheel: null, driver: null };

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

console.log('Scheduler recovery checks passed.');