/**
 * share.js — State serialization, URL sharing, and versioned migration.
 *
 * Encodes the current app state into a compact Base64 URL parameter so users
 * can share their configurations. Supports versioned payloads with automatic
 * migration from older formats, and fails silently on invalid data.
 *
 * Payload structure (v2):
 *   { v: 2, m: { A, B, phraseA, ... }, p: { m: [voice...], ap: [voice...], ... }, c: { driver, custom, ... } }
 *
 * Migration: v0/v1 payloads are automatically converted to v2 on load.
 * Future versions (v > current) are rejected.
 */

const SHARE_VERSION = 3;

/** Compresses a Uint8Array using DEFLATE via the Compression Streams API. */
async function deflateBytes(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Decompresses a DEFLATE-compressed Uint8Array. */
async function inflateBytes(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Clamps a value to an integer range, returning null for invalid input. */
function clampInteger(value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const int = Math.round(value);
    return Math.min(max, Math.max(min, int));
}

/** Returns the indices of all true values in a boolean array. */
function selectedIndexes(values) {
    const indexes = [];
    values.forEach((on, i) => {
        if (on) indexes.push(i);
    });
    return indexes;
}

/** Sets a boolean array to false, then marks the given indexes as true. */
function applySelectedIndexes(target, indexes) {
    if (!Array.isArray(target)) return;
    target.fill(false);
    if (!Array.isArray(indexes)) return;

    indexes.forEach((index) => {
        if (Number.isInteger(index) && index >= 0 && index < target.length) {
            target[index] = true;
        }
    });
}

/**
 * Encodes a payload object into a URL-safe Base64 string.
 * For v3+: JSON → UTF-8 bytes → DEFLATE compress → Base64URL with z: prefix.
 * For v2 and below: JSON → UTF-8 bytes → Base64URL (legacy format).
 */
async function encodePayload(payload) {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);

    // v3+ payloads are compressed with a z: prefix
    if (payload.v >= SHARE_VERSION) {
        const compressed = await deflateBytes(bytes);
        const binary = String.fromCharCode.apply(null, compressed);
        return 'z:' + btoa(binary)
             .replace(/\+/g, '-')
             .replace(/\//g, '_')
             .replace(/=+$/g, '');
    }

    // Legacy v2 and below: uncompressed
    const binary = String.fromCharCode.apply(null, bytes);
    return btoa(binary)
         .replace(/\+/g, '-')
         .replace(/\//g, '_')
         .replace(/=+$/g, '');
}

/**
 * Decodes a URL-safe Base64 string back into a parsed JSON object.
 * Detects z: prefix for compressed (v3+) payloads and decompresses them.
 * Falls back to legacy uncompressed decoding for older payloads.
 */
async function decodePayload(encoded) {
    let bytes;

    if (encoded.startsWith('z:')) {
         // Compressed payload: strip prefix, decode base64, then decompress
        const base64 = encoded.slice(2)
              .replace(/-/g, '+')
              .replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const binary = atob(padded);
        bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
        bytes = await inflateBytes(bytes);
    } else {
         // Legacy uncompressed payload
        const base64 = encoded
              .replace(/-/g, '+')
              .replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const binary = atob(padded);
        bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    }

    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
}

/** Serializes a single voice's pattern and channel state. */
function serializeVoice(voice, channel) {
    return {
        s: selectedIndexes(voice.selected),
        instrument: channel?.sound || null,
        volume: channel?.volume ?? 0.5,
        muted: channel?.muted ? 1 : 0
    };
}

/**
 * Serializes the current app state into a shareable payload object.
 * Includes meter settings, phrase patterns, lane patterns, and channel audio settings.
 */
function serializeState({ state, lanes, channels }) {
    return {
        v: SHARE_VERSION,
        m: {
            A: state.A,
            B: state.B,
            phraseA: state.phraseCyclesA,
            phraseB: state.phraseCyclesB,
            phaseA: state.phaseA,
            phaseB: state.phaseB,
            tempo: state.tempo
        },
        p: {
            m: lanes.master.voices.map((v, i) => serializeVoice(v, channels.masterVoices[i])),
            ap: lanes.Aphrase.voices.map((v, i) => serializeVoice(v, channels.Avoices[i])),
            aw: { s: selectedIndexes(lanes.Awheel.selected) },
            bp: lanes.Bphrase.voices.map((v, i) => serializeVoice(v, channels.Bvoices[i])),
            bw: { s: selectedIndexes(lanes.Bwheel.selected) }
        },
        c: {
            driver: {
                s: channels.driver.sound,
                v: channels.driver.volume,
                u: channels.driver.muted ? 1 : 0
            },
            awheel: {
                s: channels.Awheel.sound,
                v: channels.Awheel.volume,
                u: channels.Awheel.muted ? 1 : 0
            },
            bwheel: {
                s: channels.Bwheel.sound,
                v: channels.Bwheel.volume,
                u: channels.Bwheel.muted ? 1 : 0
            }
        }
    };
}

/**
 * Migrates a v0 payload (positional array) to v1 (named fields).
 * v0 format: m = [A, B, phraseA, phraseB, phaseA, phaseB, tempo]
 * v1 format: m = { A, B, phraseA, phraseB, phaseA, phaseB, tempo }
 */
function migrateV0toV1(payload) {
    const m = payload.m;
    if (!Array.isArray(m)) return payload;

    payload.m = {
        A: m[0],
        B: m[1],
        phraseA: m[2],
        phraseB: m[3],
        phaseA: m[4],
        phaseB: m[5],
        tempo: m[6]
    };
    payload.v = 1;
    return payload;
}

/**
 * Migrates a v1 payload (single arrays per lane) to v2 (multi-voice arrays).
 * v1 format: p = { m: [indexes], ap: [indexes], aw: [indexes], bp: [indexes], bw: [indexes] }
 * v2 format: p = { m: [{s: [...], instrument, volume, muted}], ap: [...], ... }
 */
function migrateV1toV2(payload) {
    const p = payload.p;
    if (!p || typeof p !== 'object') return payload;

    // Wrap single arrays in voice objects
    const wrapVoice = (arr) => [{ s: Array.isArray(arr) ? arr : [] }];
    const wrapSingle = (arr) => ({ s: Array.isArray(arr) ? arr : [] });

    payload.p = {
        m: wrapVoice(p.m),
        ap: wrapVoice(p.ap),
        aw: wrapSingle(p.aw),
        bp: wrapVoice(p.bp),
        bw: wrapSingle(p.bw)
    };

    // Migrate channel arrays to named objects
    const c = payload.c;
    if (c && Array.isArray(c.s) && Array.isArray(c.v) && Array.isArray(c.u)) {
        // v1 channel order: driver, custom, A, Awheel, B, Bwheel
        const channelOrder = ['driver', 'custom', 'A', 'Awheel', 'B', 'Bwheel'];
        payload.c = {};
        channelOrder.forEach((name, idx) => {
            // Skip custom, A, and B — custom is removed, A/B become voice arrays in v2
            if (name === 'custom' || name === 'A' || name === 'B') return;
            const v2Name = name === 'Awheel' ? 'awheel' : name === 'Bwheel' ? 'bwheel' : name.toLowerCase();
            payload.c[v2Name] = {
                s: c.s[idx] || null,
                v: c.v[idx] ?? 0.5,
                u: c.u[idx] || 0
            };
        });
    }

    payload.v = 2;
    return payload;
}

/**
 * Runs the appropriate migration functions based on the payload version.
 * Throws if the payload is invalid or from a future (unsupported) version.
 */
function migratePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid share payload');
    }

    // Unversioned payloads are assumed to be v0
    if (!payload.v) {
        payload = migrateV0toV1(payload);
    }

    // v0 or v1 → v2
    if (payload.v === 1) {
        payload = migrateV1toV2(payload);
    }

    // Reject payloads from future versions
    if (payload.v > SHARE_VERSION) {
        throw new Error(`Share payload version ${payload.v} is newer than supported version ${SHARE_VERSION}`);
    }

    return payload;
}

/** Applies a single voice's channel state (instrument, volume, mute). */
function applyVoiceChannelState(channel, voiceState) {
    if (!channel || !voiceState) return;

    if (voiceState.instrument && channel.soundEl) {
        const hasSoundOption = Array.from(channel.soundEl.options).some(opt => opt.value === voiceState.instrument);
        if (hasSoundOption) {
            channel.soundEl.value = voiceState.instrument;
            channel.sound = voiceState.instrument;
        }
    }

    if (typeof voiceState.volume === 'number' && Number.isFinite(voiceState.volume)) {
        channel.volume = Math.max(0, Math.min(1, voiceState.volume));
        if (channel.volEl) channel.volEl.value = String(channel.volume);
    }

    if (voiceState.muted !== undefined) {
        channel.muted = !!voiceState.muted;
        if (channel.muteEl) {
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        }
    }
}

/**
 * Restores the app state from a deserialized and migrated share payload.
 * Applies meter settings, phrase patterns, lane patterns, and channel audio settings.
 */
function restoreFromPayload(payload, deps) {
    const { state, ui, lanes, channels, updateDerivedState, updatePhaseUI, resetPatterns, buildAllLanes, resetFlashState } = deps;

    const meters = payload.m;
    if (!meters || typeof meters !== 'object') return;

    const a = clampInteger(meters.A, 2, 16);
    const b = clampInteger(meters.B, 2, 16);
    const phraseA = clampInteger(meters.phraseA, 1, 4);
    const phraseB = clampInteger(meters.phraseB, 1, 4);

    if (a !== null) state.A = a;
    if (b !== null) state.B = b;
    if (phraseA !== null) state.phraseCyclesA = phraseA;
    if (phraseB !== null) state.phraseCyclesB = phraseB;

    ui.selectA.value = String(state.A);
    ui.selectB.value = String(state.B);
    ui.phraseCyclesA.value = String(state.phraseCyclesA);
    ui.phraseCyclesB.value = String(state.phraseCyclesB);

    updateDerivedState(state);

    const phaseA = clampInteger(meters.phaseA, 0, state.mainTeeth - 1);
    const phaseB = clampInteger(meters.phaseB, 0, state.mainTeeth - 1);

    if (phaseA !== null) state.phaseA = phaseA;
    if (phaseB !== null) state.phaseB = phaseB;

    ui.phaseSliderA.value = String(state.phaseA);
    ui.phaseSliderB.value = String(state.phaseB);

    const tempo = clampInteger(meters.tempo, 30, 180);
    if (tempo !== null) {
        state.tempo = tempo;
        ui.tempoSlider.value = String(tempo);
        ui.tempoLabel.textContent = String(tempo);
    }

    updatePhaseUI(state, ui);
    resetPatterns(state, lanes);

    if (payload.p && typeof payload.p === 'object') {
        // Multi-voice lanes: restore each voice
        const restoreVoiceLane = (lane, voiceData, prefix, container, color, label) => {
            if (!Array.isArray(voiceData)) return;
            // Clear existing voices and rebuild from payload
            lane.voices.length = 0;
            voiceData.forEach((vd, idx) => {
                const voice = { selected: [], buttons: [], channel: null, _channelState: vd };
                voice.selected = new Array(lane.count()).fill(false);
                applySelectedIndexes(voice.selected, vd.s);
                lane.voices.push(voice);
            });
        };

        restoreVoiceLane(lanes.master, payload.p.m, 'master', ui.masterVoiceContainer, '#ff9100', 'Master');
        restoreVoiceLane(lanes.Aphrase, payload.p.ap, 'A', ui.AVoiceContainer, '#ff3366', 'A Phrase');
        restoreVoiceLane(lanes.Bphrase, payload.p.bp, 'B', ui.BVoiceContainer, '#00e5ff', 'B Phrase');

        // Single-voice lanes
        if (payload.p.aw) applySelectedIndexes(lanes.Awheel.selected, payload.p.aw.s);
        if (payload.p.bw) applySelectedIndexes(lanes.Bwheel.selected, payload.p.bw.s);
    }

    // Restore fixed channel state
    const fixedChannels = ['driver', 'awheel', 'bwheel'];
    if (payload.c && typeof payload.c === 'object') {
        fixedChannels.forEach(name => {
            const channelState = payload.c[name];
            if (!channelState) return;
            const channel = channels[name];
            if (!channel) return;
            applyVoiceChannelState(channel, channelState);
        });
    }

    state.mainAngle = 0;
    resetFlashState(state);
    buildAllLanes(lanes);
}

/** Builds a full share URL with the encoded state as a query parameter. */
async function createShareUrl(shareData) {
    const encoded = await encodePayload(shareData);
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('s', encoded);
    return url.toString();
}

/** Copies the share URL to clipboard, falling back to a prompt if unavailable. */
async function copyToClipboard(url) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        window.prompt('Copy this share link:', url);
        return;
    }

    try {
        await navigator.clipboard.writeText(url);
    } catch (err) {
        window.prompt('Copy this share link:', url);
    }
}

/** Temporarily changes the share button text to provide visual feedback. */
function pulseShareButton(button, label) {
    const original = button.textContent;
    button.textContent = label;
    window.setTimeout(() => {
        button.textContent = original;
    }, 1200);
}

/** Encodes the current state and copies the share URL to the clipboard. */
export async function copyShareLink(deps) {
    try {
        const payload = serializeState(deps);
        const url = await createShareUrl(payload);
        await copyToClipboard(url);
        pulseShareButton(deps.ui.shareBtn, 'Copied');
     } catch (err) {
        console.error('Share failed:', err);
        pulseShareButton(deps.ui.shareBtn, 'Error');
     }
}

/**
 * Checks the URL for a share parameter, decodes and migrates the payload,
 * then restores the app state. Returns false if no share param or if the
 * payload is invalid (app falls back to defaults in that case).
 */
export async function loadStateFromUrl(deps) {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('s');
    if (!encoded) return false;

    try {
        const raw = await decodePayload(encoded);
        const payload = migratePayload(raw);
        restoreFromPayload(payload, deps);
        return true;
     } catch {
        return false;
     }
}
