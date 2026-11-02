import assert from 'node:assert/strict';
import { computeProjectedTicks, laneProjectionKey, projectedRotationAngle, projectionLabel } from './projection.js';

function groupingState(mainTeeth, visibleCycle, cycles = 1) {
    return {
        mainTeeth,
        masterPhraseCycles: 1,
        visibleCycle: { grouping_0: visibleCycle }
    };
}

function groupingLane({ groupCount, cycles = 1, phase = 0, selected }) {
    return {
        channelPrefix: 'grouping_0',
        cycleKey: 'grouping_0',
        groupCount,
        cycles,
        phase,
        voices: [{ selected }]
    };
}

{
    const lane = groupingLane({ groupCount: 4, selected: [true, false, true, false] });
    assert.deepEqual(computeProjectedTicks(groupingState(12, 0), lane, lane.voices[0]), [0, 6]);
}

{
    const lane = groupingLane({ groupCount: 4, phase: 1, selected: [true, false, true, false] });
    assert.deepEqual(computeProjectedTicks(groupingState(12, 0), lane, lane.voices[0]), [1, 7]);
}

{
    const lane = groupingLane({
        groupCount: 4,
        cycles: 2,
        selected: [false, false, false, false, true, false, true, false]
    });
    assert.deepEqual(computeProjectedTicks(groupingState(12, 1, 2), lane, lane.voices[0]), [0, 6]);
}

{
    const state = { mainTeeth: 12, masterPhraseCycles: 2, visibleCycle: { master: 1 } };
    const lane = { channelPrefix: 'master', voices: [] };
    const selected = new Array(24).fill(false);
    selected[12] = true;
    selected[13] = true;
    assert.deepEqual(computeProjectedTicks(state, lane, { selected }), [0, 1]);
}

{
    const state = { mainTeeth: 12, masterPhraseCycles: 1, visibleCycle: {} };
    const lane = groupingLane({ groupCount: 1, selected: [true] });
    assert.deepEqual(computeProjectedTicks(state, lane, lane.voices[0]), [0]);
}

assert.equal(laneProjectionKey({ channelPrefix: 'master' }), 'master');
assert.equal(laneProjectionKey({ cycleKey: 'grouping_4' }), 'grouping_4');
assert.equal(projectionLabel({ channelPrefix: 'master' }, 0), 'Master V1');
assert.equal(projectionLabel({ groupCount: 6, channelPrefix: 'grouping_7' }, 2), 'G6 V3');

{
    const N = 12;
    const step = (2 * Math.PI) / N;
    for (const tick of [0, 1, 3, 6, 11]) {
        const angle = projectedRotationAngle(tick, N, -tick * step);
        const topError = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
        assert.ok(topError < 1e-9, `Projected tick ${tick} should reach 12 o'clock at pulse ${tick}.`);
    }
}

console.log('Projection checks passed.');
