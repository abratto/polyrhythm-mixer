#!/usr/bin/env node
import assert from 'node:assert/strict';

import { getActivePhraseStep } from './math.js';

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

console.log('Grouping offset checks passed.');
