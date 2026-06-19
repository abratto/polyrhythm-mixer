#!/usr/bin/env node
import assert from 'node:assert/strict';

import { getMeshedWheelAngle, lcm } from './math.js';

function assertClose(actual, expected, message) {
    const epsilon = 1e-10;
    assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: expected ${expected}, got ${actual}`);
}

function checkMeterRatio(a, b, mainAngle) {
    const mainTeeth = lcm(a, b);
    const teethA = mainTeeth / a;
    const teethB = mainTeeth / b;

    assertClose(
        getMeshedWheelAngle(mainAngle, 0, mainTeeth, teethA),
        mainAngle * a,
        `Meter A should rotate ${a}x the main wheel for ${a} against ${b}`
    );

    assertClose(
        getMeshedWheelAngle(mainAngle, 0, mainTeeth, teethB),
        mainAngle * b,
        `Meter B should rotate ${b}x the main wheel for ${a} against ${b}`
    );
}

checkMeterRatio(6, 4, Math.PI / 3);
checkMeterRatio(12, 18, Math.PI / 2);
checkMeterRatio(17, 18, 1.2345);

const mainTeeth = lcm(12, 18);
const teethA = mainTeeth / 12;
const shiftedAngle = getMeshedWheelAngle(Math.PI / 2, 3, mainTeeth, teethA);
assertClose(
    shiftedAngle,
    (Math.PI / 2) * 12 - 2 * Math.PI,
    'A phase shift of one 12-pulse step should offset the wheel by one full rotation'
);

console.log('Wheel ratio checks passed.');