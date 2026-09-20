#!/usr/bin/env node
import assert from 'node:assert/strict';

import { groupingDivisors, groupedPattern } from './math.js';

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

console.log('Grouping divisor checks passed.');
