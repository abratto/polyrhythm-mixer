#!/usr/bin/env node
import assert from 'node:assert/strict';

import { instrumentData } from './instrument-data.js';
import { instruments } from './instruments.js';

const keys = [
    'baseFreq', 'pitchBend', 'pitchBendTime', 'bodyVol', 'bodyDecay',
    'overRatio1', 'overVol1', 'overDecay1', 'overRatio2', 'overVol2', 'overDecay2',
    'overRatio3', 'overVol3', 'overDecay3', 'couplingFreq', 'couplingVol',
    'couplingDelay', 'couplingAttack', 'couplingDecay', 'slapFreq', 'slapEndFreq',
    'slapQ', 'slapVol', 'slapDecay'
];
const patches = {
    bata_high_slap: [580, 1.28, 0.006, 0.24, 0.022, 1.48, 0.36, 0.05, 1.91, 0.18, 0.032, 2.36, 0.1, 0.02, 280, 0.12, 0.0016, 0.005, 0.1, 4600, 2200, 1.4, 0.7, 0.03],
    bata_middle_slap: [485, 1.34, 0.007, 0.32, 0.026, 1.47, 0.48, 0.062, 1.89, 0.25, 0.038, 2.33, 0.14, 0.024, 205, 0.18, 0.0021, 0.007, 0.14, 4200, 1950, 1.3, 0.85, 0.036],
    bata_low_slap: [390, 1.38, 0.008, 0.38, 0.03, 1.46, 0.54, 0.072, 1.86, 0.28, 0.044, 2.29, 0.16, 0.028, 142, 0.25, 0.0027, 0.009, 0.185, 3800, 1700, 1.2, 0.92, 0.042]
};

function audioParam() {
    const events = [];
    return {
        events,
        setValueAtTime(value, time) { events.push(['set', value, time]); },
        linearRampToValueAtTime(value, time) { events.push(['linear', value, time]); },
        exponentialRampToValueAtTime(value, time) { events.push(['exponential', value, time]); }
    };
}

function recordingContext() {
    const nodes = [];
    const node = kind => {
        const result = {
            kind, frequency: audioParam(), Q: audioParam(), gain: audioParam(),
            connect() {},
            disconnect() { this.disconnected = true; },
            start(time, offset = 0) { this.startTime = time; this.offset = offset; },
            stop(time) { this.stopTime = time; }
        };
        nodes.push(result);
        return result;
    };
    return {
        nodes, sampleRate: 48000, destination: {},
        createGain: () => node('gain'),
        createOscillator: () => node('oscillator'),
        createBiquadFilter: () => node('filter'),
        createBufferSource: () => node('noise'),
        createBuffer: (_, length) => ({ getChannelData: () => new Float32Array(length) })
    };
}

for (const [key, expected] of Object.entries(patches)) {
    const params = instrumentData[key].params;
    const p = Object.fromEntries(params.map(({ k, v }) => [k, v]));
    assert.deepEqual(keys.map(k => p[k]), expected, `${key}: supplied tuning table`);
    for (const { k, v, lo, hi, step } of params) {
        assert(v >= lo && v <= hi, `${key}.${k}: default fits slider range`);
        const steps = (v - lo) / step;
        assert(Math.abs(steps - Math.round(steps)) < 1e-8, `${key}.${k}: default fits slider step`);
    }
    assert(p.overVol1 > p.bodyVol && p.overDecay1 > p.bodyDecay, `${key}: membrane mode dominates body`);
    assert(Math.abs(p.overPitchBend - p.pitchBend * 1.05) < 1e-10);
    assert.equal(p.overBendTime, 0.009);
    assert.equal(p.smackFreq, { bata_high_slap: 1350, bata_middle_slap: 1150, bata_low_slap: 950 }[key]);
    assert.equal(p.smackQ, 0.9);
    assert.equal(p.smackDecay, 0.015);
    assert.equal(p.smackVol, 0.18);
    assert.equal(p.slapBandpass, 1);

    const ctx = recordingContext();
    const now = 2;
    instruments[key]({ audioCtx: ctx }, now, 0.5);
    const oscillators = ctx.nodes.filter(n => n.kind === 'oscillator');
    assert.equal(oscillators.length, 5, `${key}: fundamental, three modes, coupling`);
    assert.deepEqual(oscillators[0].frequency.events, [
        ['set', p.baseFreq * p.pitchBend, now],
        ['exponential', p.baseFreq, now + p.pitchBendTime]
    ]);
    assert.equal(oscillators[0].stopTime, now + p.bodyDecay);
    for (let i = 1; i <= 3; i++) {
        const frequency = p.baseFreq * p[`overRatio${i}`];
        assert.deepEqual(oscillators[i].frequency.events, i <= 2 ? [
            ['set', frequency * p.overPitchBend, now],
            ['exponential', frequency, now + p.overBendTime]
        ] : [['set', frequency, now]]);
        assert.equal(oscillators[i].stopTime, now + p[`overDecay${i}`]);
    }
    assert.equal(oscillators[4].startTime, now + p.couplingDelay);
    assert.equal(oscillators[4].stopTime, now + p.couplingDelay + p.couplingDecay + 0.05);
    const filter = ctx.nodes.find(n => n.kind === 'filter');
    assert.equal(filter.type, 'bandpass');
    assert.deepEqual(filter.frequency.events, [
        ['set', p.slapFreq, now],
        ['exponential', p.slapEndFreq, now + p.slapDecay]
    ]);
    assert.deepEqual(filter.Q.events, [['set', p.slapQ, now]]);
    const noise = ctx.nodes.find(n => n.kind === 'noise');
    assert.equal(noise.stopTime, now + p.slapDecay + 0.02);
    noise.onended();
    assert(noise.disconnected && filter.disconnected, `${key}: transient nodes cleaned up`);
    const filters = ctx.nodes.filter(n => n.kind === 'filter');
    const noises = ctx.nodes.filter(n => n.kind === 'noise');
    assert.equal(filters.length, 2);
    assert.equal(noises.length, 2);
    assert.equal(filters[1].type, 'bandpass');
    assert.deepEqual(filters[1].frequency.events, [['set', p.smackFreq, now]]);
    assert.deepEqual(filters[1].Q.events, [['set', p.smackQ, now]]);
    assert.equal(noises[1].stopTime, now + p.smackDecay + 0.02);
    assert(noises[1].offset >= 0 && noises[1].offset + p.smackDecay + 0.02 < 1);
    noises[1].onended();
    assert(filters[1].disconnected && noises[1].disconnected);

    // A long, isolated snap must not be cut short by the shared output envelope.
    const saved = params.map(({ v }) => v);
    try {
        for (const param of params) {
            if (param.k.endsWith('Vol') || /^overVol/.test(param.k)) param.v = 0;
            if (param.k.endsWith('Decay') || /^overDecay/.test(param.k)) param.v = param.lo;
        }
        params.find(p => p.k === 'slapVol').v = 0.75;
        params.find(p => p.k === 'slapDecay').v = 0.1;
        const isolated = recordingContext();
        instruments[key]({ audioCtx: isolated }, now, 0.5);
        const output = isolated.nodes[0];
        assert.equal(output.gain.events.at(-1)[2], now + 0.1 + 0.05);

        params.find(p => p.k === 'slapBandpass').v = 0;
        params.find(p => p.k === 'overPitchBend').v = 1;
        params.find(p => p.k === 'overVol1').v = 0.3;
        const previous = recordingContext();
        instruments[key]({ audioCtx: previous }, now, 0.5);
        assert.equal(previous.nodes.filter(n => n.kind === 'filter').length, 1,
            `${key}: zero smack volume removes its layer`);
        assert.equal(previous.nodes.find(n => n.kind === 'filter').type, 'highpass');
        assert.equal(previous.nodes.filter(n => n.kind === 'oscillator')[1].frequency.events.length, 1,
            `${key}: unity overtone bend restores static frequency`);

        params.find(p => p.k === 'slapVol').v = 0;
        params.find(p => p.k === 'smackVol').v = 0.18;
        params.find(p => p.k === 'smackDecay').v = 0.1;
        const smackOnly = recordingContext();
        instruments[key]({ audioCtx: smackOnly }, now, 0.5);
        assert.equal(smackOnly.nodes[0].gain.events.at(-1)[2], now + 0.1 + 0.05,
            `${key}: isolated flesh smack retains its full tail`);
    } finally {
        params.forEach((param, i) => { param.v = saved[i]; });
    }
}

const tonalContext = recordingContext();
instruments.bata_high({ audioCtx: tonalContext }, 0, 0.5);
const tonalFilter = tonalContext.nodes.find(n => n.kind === 'filter');
assert.equal(tonalFilter.type, 'highpass');
assert.deepEqual(tonalFilter.frequency.events, [['set',
    instrumentData.bata_high.params.find(p => p.k === 'slapFreq').v, 0]],
'Non-slap Batá keeps its static transient filter.');

console.log('Batá slap checks passed: three tuning tables, slider precision, pitch/modes, coupling, sweep, cleanup, isolated tail, tonal compatibility.');
