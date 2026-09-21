#!/usr/bin/env node
import assert from 'node:assert/strict';

import { groupingDivisors, groupedPattern, getActivePhraseStep } from './math.js';

// The 72 frame (18 against 24) exposes the target group sizes plus the coarser
// divisors of 72, smallest first.
assert.deepEqual(
    groupingDivisors(72),
    [2, 3, 4, 6, 8, 9, 12, 18, 24, 36],
    'The 72 frame should offer equal groupings 2,3,4,6,8,9,12,18,24,36.'
);

// The 12 frame from the original example: groups of 2, 3, 4, 6.
assert.deepEqual(
    groupingDivisors(12),
    [2, 3, 4, 6],
    'The 12 frame should offer equal groupings 2,3,4,6.'
);

assert.deepEqual(groupingDivisors(6), [2, 3], '6 should offer groupings 2 and 3.');
assert.deepEqual(groupingDivisors(4), [2], '4 should offer only grouping 2.');
assert.deepEqual(groupingDivisors(35), [5, 7], '35 should offer groupings 5 and 7.');
assert.deepEqual(groupingDivisors(3), [], 'A 3-pulse frame has no multi-group equal division.');
assert.deepEqual(groupingDivisors(2), [], 'A 2-pulse frame has no multi-group equal division.');
assert.deepEqual(groupingDivisors(5), [], 'A prime 5-pulse frame has no multi-group equal division.');
assert.deepEqual(groupingDivisors(0), [], 'A zero frame is invalid.');
assert.deepEqual(groupingDivisors(-6), [], 'A negative frame is invalid.');

// groupedPattern: onset at 0 and every groupSize, repeated across phrase cycles.
assert.deepEqual(
    groupedPattern(12, 3),
    [true, false, false, true, false, false, true, false, false, true, false, false],
    'A groups-of-3 pattern over 12 steps should tap steps 0,3,6,9.'
);
assert.deepEqual(
    groupedPattern(6, 4),
    [true, false, false, false, true, false],
    'A groups-of-4 pattern over 6 steps should tap steps 0 and 4.'
);
assert.deepEqual(
    groupedPattern(4, 0),
    [false, false, false, false],
    'An invalid group size should yield an empty pattern rather than throwing.'
);

// Phase offset: an N-group lane over a frame has groupSize = frame/N start
// positions, and phase `p` shifts the grouping's first onset to pulse `p`.
// (groupSize 4, 3 groups == the "3 groups of 4" lane of a 3-against-4 frame.)
{
    const groupSize = 4;
    const count = 3;
    for (let phase = 0; phase < groupSize; phase++) {
        let firstOnset = -1;
        for (let s = 0; s < groupSize * count; s++) {
            if (getActivePhraseStep(s, phase, groupSize, count) === 0) { firstOnset = s; break; }
        }
        assert.equal(firstOnset, phase,
            `Phase ${phase} should start the grouping on pulse ${phase} of ${groupSize}.`);
    }

    // Spot-check the mapping either side of the shifted boundary.
    assert.equal(getActivePhraseStep(1, 1, groupSize, count), 0, 'phase 1 fires group 0 at pulse 1.');
    assert.equal(getActivePhraseStep(0, 1, groupSize, count), 2, 'phase 1 wraps the last group to pulse 0.');
    assert.equal(getActivePhraseStep(5, 1, groupSize, count), 1, 'phase 1 fires group 1 at pulse 5.');
}

console.log('Grouping divisor checks passed.');
