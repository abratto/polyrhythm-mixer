#!/usr/bin/env node
import assert from 'node:assert/strict';

import { acquireOsc } from './pool.js';

let created = 0;
const context = {
    createOscillator() {
        return { id: ++created };
    }
};

const oscillators = Array.from({ length: 1_000 }, () => acquireOsc(context));

assert.equal(created, 1_000, 'Each strike should create a fresh one-shot oscillator.');
assert.equal(new Set(oscillators).size, 1_000, 'Oscillator sources must never be reused after start.');

console.log('Oscillator lifecycle checks passed.');