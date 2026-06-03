/**
 * test-compression.js — Measures the compression ratio of DEFLATE + Base64URL
 * vs plain Base64URL for a realistic polyrhythm-mixer share payload.
 *
 * Run with: node scripts/test-compression.js
 */

const zlib = require('zlib');

// Base64URL encoding/decoding helpers
function toBase64URL(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64URL(b64url) {
    return b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), '=');
}

function serializePayload(payload) {
    return JSON.stringify(payload);
}

function encodeUncompressed(json) {
    const bytes = Buffer.from(json, 'utf-8');
    const b64 = bytes.toString('base64');
    return toBase64URL(b64);
}

function encodeCompressed(json) {
    const bytes = Buffer.from(json, 'utf-8');
    const compressed = zlib.deflateSync(bytes);
    const b64 = compressed.toString('base64');
    return 'z:' + toBase64URL(b64);
}

// Build a realistic payload based on the serializeState function
function buildRealisticPayload() {
    return {
        v: 3,
        m: {
            A: 5,
            B: 7,
            phraseA: 3,
            phraseB: 4,
            phaseA: 0,
            phaseB: 0,
            tempo: 120
        },
        p: {
            m: [
                { s: [0, 2, 4], instrument: 'Kick 1', volume: 0.8, muted: 0 },
                { s: [1, 3], instrument: 'Snare 2', volume: 0.6, muted: 0 },
                { s: [0, 1, 2, 3, 4, 5, 6, 7], instrument: 'Hi-Hat', volume: 0.4, muted: 1 }
            ],
            ap: [
                { s: [0, 3, 6], instrument: 'Tom 1', volume: 0.7, muted: 0 },
                { s: [1, 4, 7], instrument: 'Tom 2', volume: 0.5, muted: 0 },
                { s: [2, 5], instrument: 'Clap', volume: 0.6, muted: 1 },
                { s: [0, 2, 4, 6], instrument: 'Ride', volume: 0.3, muted: 0 }
            ],
            aw: { s: [1, 3, 5] },
            bp: [
                { s: [0, 2, 5, 7], instrument: 'Kick 2', volume: 0.7, muted: 0 },
                { s: [1, 3, 6], instrument: 'Snare 1', volume: 0.5, muted: 0 },
                { s: [0, 1, 3, 5, 7], instrument: 'Crash', volume: 0.4, muted: 0 }
            ],
            bw: { s: [0, 2, 4, 6] }
        },
        c: {
            driver: { s: 'Drum Kit A', v: 0.9, u: 0 },
            awheel: { s: 'Synth Bass', v: 0.5, u: 1 },
            bwheel: { s: 'Lead Synth', v: 0.6, u: 0 }
        }
    };
}

// Build a "heavy" payload with many voices
function buildHeavyPayload() {
    const makeVoice = (s, instrument, volume, muted) => ({ s, instrument, volume, muted });
    return {
        v: 3,
        m: { A: 7, B: 11, phraseA: 5, phraseB: 3, phaseA: 0, phaseB: 0, tempo: 90 },
        p: {
            m: Array.from({ length: 6 }, (_, i) => makeVoice([i * 2], `Drum ${i + 1}`, 0.5, 0)),
            ap: Array.from({ length: 8 }, (_, i) => makeVoice([i * 3 % 16], `Perc ${i + 1}`, 0.5, 0)),
            aw: { s: [1, 3, 5, 7, 9] },
            bp: Array.from({ length: 8 }, (_, i) => makeVoice([i * 2 % 16], `Beat ${i + 1}`, 0.5, 0)),
            bw: { s: [0, 2, 4, 6, 8, 10] }
        },
        c: {
            driver: { s: 'Orchestral Kit', v: 0.8, u: 0 },
            awheel: { s: 'FM Bass', v: 0.6, u: 0 },
            bwheel: { s: 'Wavetable Lead', v: 0.7, u: 0 }
        }
    };
}

// Build a "light" payload with minimal voices
function buildLightPayload() {
    return {
        v: 3,
        m: { A: 3, B: 4, phraseA: 1, phraseB: 1, phaseA: 0, phaseB: 0, tempo: 100 },
        p: {
            m: [{ s: [0, 4], instrument: 'Kick', volume: 0.8, muted: 0 }],
            aw: { s: [0] },
            bp: [{ s: [0, 2, 4, 6], instrument: 'Snare', volume: 0.6, muted: 0 }],
            bw: { s: [] }
        },
        c: {
            driver: { s: 'Default Kit', v: 0.7, u: 0 },
            awheel: { s: null, v: 0.5, u: 1 },
            bwheel: { s: null, v: 0.5, u: 1 }
        }
    };
}

function testPayload(name, payload) {
    const json = serializePayload(payload);
    const uncompressed = encodeUncompressed(json);
    const compressed = encodeCompressed(json);

    const ratio = ((compressed.length / uncompressed.length) * 100).toFixed(1);
    const savings = (100 - (compressed.length / uncompressed.length) * 100).toFixed(1);

    console.log(`\n=== ${name} ===`);
    console.log(`  JSON size:      ${json.length} bytes`);
    console.log(`  Uncompressed:   ${uncompressed.length} chars (${uncompressed.substring(0, 60)}...)`);
    console.log(`  Compressed:     ${compressed.length} chars (${compressed.substring(0, 60)}...)`);
    console.log(`  Compression:    ${ratio}% (saves ${savings}%)`);
    console.log(`  Difference:     ${uncompressed.length - compressed.length} chars`);
}

// Run tests
console.log('Polyrhythm Mixer — Compression Test');
console.log('=====================================\n');

testPayload('Light Payload (2 voices)', buildLightPayload());
testPayload('Realistic Payload (4 A + 3 B voices)', buildRealisticPayload());
testPayload('Heavy Payload (6 M + 8 A + 8 B voices)', buildHeavyPayload());

// Also test a range of voice counts
console.log('\n=== Voice Count Sweep ===');
for (let n = 1; n <= 10; n++) {
    const payload = {
        v: 3,
        m: { A: 5, B: 7, phraseA: 3, phraseB: 4, phaseA: 0, phaseB: 0, tempo: 120 },
        p: {
            m: Array.from({ length: n }, (_, i) => ({ s: [i], instrument: `Drum ${i + 1}`, volume: 0.5, muted: 0 })),
            ap: [{ s: [0, 2, 4], instrument: 'Perc', volume: 0.5, muted: 0 }],
            aw: { s: [1] },
            bp: [{ s: [0, 3], instrument: 'Beat', volume: 0.5, muted: 0 }],
            bw: { s: [] }
        },
        c: {
            driver: { s: 'Kit', v: 0.7, u: 0 },
            awheel: { s: 'Synth', v: 0.5, u: 0 },
            bwheel: { s: 'Lead', v: 0.5, u: 0 }
        }
    };
    const json = serializePayload(payload);
    const uncompressed = encodeUncompressed(json);
    const compressed = encodeCompressed(json);
    const ratio = ((compressed.length / uncompressed.length) * 100).toFixed(1);
    console.log(`  ${n} master voice(s): ${json.length}B JSON → ${compressed.length}B compressed / ${uncompressed.length}B uncompressed (${ratio}%)`);
}