/**
 * Regression checks for payload migrations and save/share round trips.
 */
import assert from 'node:assert/strict';
import { migratePayload } from './share.js';

function migrate(payload) {
    return migratePayload(structuredClone(payload));
}

{
    const payload = migrate({
        v: 1,
        m: { A: 6, B: 4, phraseA: 2, phraseB: 3, phaseA: 1, phaseB: 2, tempo: 96 },
        p: {
            m: [0, 4],
            ap: [0, 2],
            aw: [0, 1],
            bp: [1],
            bw: [2]
        },
        c: {
            s: ['shaker', 'clap', 'woodblock', 'rimshot', 'cowbell', 'claves'],
            v: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
            u: [0, 1, 1, 0, 1, 0]
        }
    });

    const [laneA, laneB] = payload.p.gl;
    assert.equal(payload.v, 6);
    assert.equal(laneA.lk, 'A');
    assert.equal(laneA.ph, 1);
    assert.equal(laneB.lk, 'B');
    assert.equal(laneB.ph, 2);
    assert.deepEqual(laneA.v[0], {
        s: [0, 2],
        i: 'woodblock',
        v: 0.3,
        u: 1
    });
    assert.deepEqual(laneB.v[0], {
        s: [1],
        i: 'cowbell',
        v: 0.5,
        u: 1
    });
    assert.deepEqual(payload.p.m[0], {
        s: [0, 4],
        i: 'clap',
        v: 0.2,
        u: 1
    });
    assert.deepEqual(laneA.v[1], {
        s: [0, 1],
        i: 'rimshot',
        v: 0.4,
        u: 0
    });
    assert.deepEqual(laneB.v[1], {
        s: [2],
        i: 'claves',
        v: 0.6,
        u: 0
    });
}

{
    const payload = migrate({
        v: 4,
        m: { A: 6, B: 4, phraseA: 2, phraseB: 1, phaseA: 1, phaseB: 0, tempo: 110 },
        p: {
            m: [{ s: [0], i: 'kick', v: 0.8, u: 0 }],
            ap: [{ s: [0, 7], i: 'phrase-a', v: 0.7, u: 0, o: 1 }],
            aw: { s: [1, 2, 3, 4] },
            bp: [{ s: [1], i: 'phrase-b', v: 0.6, u: 0 }],
            bw: { s: [] }
        },
        c: {
            driver: { s: 'shaker', v: 0.5, u: 0 },
            awheel: { s: 'wheel-a', v: 0.25, u: 1, o: 1 },
            bwheel: { s: 'wheel-b', v: 0.35, u: 0 }
        }
    });

    const [laneA] = payload.p.gl;
    assert.deepEqual(laneA.v[0], {
        s: [0, 7],
        i: 'phrase-a',
        v: 0.7,
        u: 0,
        o: 1
    });
    assert.deepEqual(laneA.v[1], {
        s: [0, 1],
        i: 'wheel-a',
        v: 0.25,
        u: 1,
        o: 1
    });
    assert.deepEqual(payload.p.gl[2], {
        g: 12,
        c: 1,
        ph: 0,
        lk: null,
        v: [{
            s: [2, 4],
            i: 'wheel-a',
            v: 0.25,
            u: 1,
            o: 1
        }]
    });
}

{
    const payload = migrate({
        v: 5,
        m: { A: 3, B: 4, masterPhrase: 1, phaseA: 0, phaseB: 0, tempo: 90 },
        p: {
            m: [{ s: [0] }],
            gl: [
                { g: 3, c: 1, ph: 0, lk: 'A', v: [{ s: [0], i: 'phrase-a' }] },
                { g: 6, c: 1, ph: 0, lk: null, v: [{ s: [2], i: 'custom' }] }
            ],
            aw: { s: [0] },
            bw: { s: [1] }
        },
        c: {
            awheel: { s: 'wheel-a', v: 0.3, u: 0 },
            bwheel: { s: 'wheel-b', v: 0.4, u: 1 }
        }
    });

    assert.equal(payload.p.gl[0].v.length, 2, 'A wheel should stay with the linked A lane');
    assert.equal(payload.p.gl[1].v.length, 1, 'B wheel should not attach to an unrelated lane');
    assert.deepEqual(payload.p.gl[2], {
        g: 12,
        c: 1,
        ph: 0,
        lk: null,
        v: [{ s: [1], i: 'wheel-b', v: 0.4, u: 1 }]
    });
}

{
    const payload = migrate({
        v: 5,
        m: { A: 3, B: 4, masterPhrase: 1, phaseA: 0, phaseB: 0, tempo: 90 },
        p: { m: [{ s: [0] }], gl: [], aw: { s: [] }, bw: { s: [] } },
        c: {}
    });
    assert.deepEqual(payload.p.gl, []);
}

console.log('Serialization migration checks passed.');
