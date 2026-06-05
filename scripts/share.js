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

/** Converts a Uint8Array to a binary string using chunked spread to avoid argument count limits. */
function bytesToBinary(bytes) {
    const chunkSize = 0x8000;
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return binary;
}

/** Converts a binary string to a Uint8Array. */
function binaryToBytes(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/** Encodes a Uint8Array to a Base64URL string. */
function base64UrlEncodeBytes(bytes) {
    return btoa(bytesToBinary(bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

/** Decodes a Base64URL string to a Uint8Array. */
function base64UrlDecodeToBytes(encoded) {
    const base64 = encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return binaryToBytes(binary);
}

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

/** Checks if CompressionStream/DecompressionStream APIs are available. */
function supportsCompressionStreams() {
    return typeof CompressionStream !== 'undefined' &&
           typeof DecompressionStream !== 'undefined';
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
        return 'z:' + base64UrlEncodeBytes(compressed);
    }

    // Legacy v2 and below: uncompressed
    return base64UrlEncodeBytes(bytes);
}

/**
 * Decodes a URL-safe Base64 string back into a parsed JSON object.
 * Detects z: prefix for compressed (v3+) payloads and decompresses them.
 * Falls back to legacy uncompressed decoding for older payloads.
 */
async function decodePayload(encoded) {
    let bytes;

    if (encoded.startsWith('z:')) {
          // Compressed payload: strip prefix, decode base64URL, then decompress
        bytes = base64UrlDecodeToBytes(encoded.slice(2));
        bytes = await inflateBytes(bytes);
    } else {
          // Legacy uncompressed payload
        bytes = base64UrlDecodeToBytes(encoded);
    }

    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
}

/** Serializes a single voice's pattern and channel state using compact field names. */
function serializeVoice(voice, channel) {
    const serialized = {
        s: selectedIndexes(voice.selected),
        i: channel?.sound || null,
        v: channel?.volume ?? 0.5,
        u: channel?.muted ? 1 : 0
    };

    if (voice.nudgeOffset) serialized.n = voice.nudgeOffset;

    return serialized;
}

/**
 * Serializes the current app state into a shareable payload object.
 * Includes meter settings, phrase patterns, lane patterns, and channel audio settings.
 */
function serializeState({ state, ui, lanes, channels }) {
    return {
        v: SHARE_VERSION,
        m: {
            A: state.A,
            B: state.B,
            phraseA: state.phraseCyclesA,
            phraseB: state.phraseCyclesB,
            phaseA: 0,
            phaseB: 0,
            tempo: state.tempo,
            masterVolume: Number.parseInt(ui.masterVolumeSlider.value, 10)
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

/** Applies a single voice's channel state (instrument, volume, mute).
 * Accepts both compact (i/v/u) and legacy (instrument/volume/muted) field names. */
function applyVoiceChannelState(channel, voiceState) {
    if (!channel || !voiceState) return;

    const sound = voiceState.i ?? voiceState.instrument;
    const volume = voiceState.v ?? voiceState.volume;
    const muted = voiceState.u ?? voiceState.muted;

    if (sound && channel.soundEl) {
        const hasSoundOption = Array.from(channel.soundEl.options).some(opt => opt.value === sound);
        if (hasSoundOption) {
            channel.soundEl.value = sound;
            channel.sound = sound;
         }
       }

    if (typeof volume === 'number' && Number.isFinite(volume)) {
        channel.volume = Math.max(0, Math.min(1, volume));
        if (channel.volEl) channel.volEl.value = String(channel.volume);
       }

    if (muted !== undefined) {
        channel.muted = !!muted;
        if (channel.muteEl) {
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
         }
       }
}

/** Applies a fixed channel's state (driver, Awheel, Bwheel) using compact s/v/u format. */
function applyFixedChannelState(channel, channelState) {
    if (!channel || !channelState) return;

    const sound = channelState.s ?? channelState.instrument;
    const volume = channelState.v ?? channelState.volume;
    const muted = channelState.u ?? channelState.muted;

    if (sound && channel.soundEl) {
        const hasSoundOption = Array.from(channel.soundEl.options).some(opt => opt.value === sound);
        if (hasSoundOption) {
            channel.soundEl.value = sound;
            channel.sound = sound;
        }
      }

    if (typeof volume === 'number' && Number.isFinite(volume)) {
        channel.volume = Math.max(0, Math.min(1, volume));
        if (channel.volEl) channel.volEl.value = String(channel.volume);
      }

    if (muted !== undefined) {
        channel.muted = !!muted;
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

    state.phaseA = 0;
    state.phaseB = 0;

    const tempo = clampInteger(meters.tempo, 30, 180);
    if (tempo !== null) {
        state.tempo = tempo;
        ui.tempoSlider.value = String(tempo);
        ui.tempoLabel.textContent = String(tempo);
    }

    const masterVolume = clampInteger(meters.masterVolume, 0, 100);
    if (masterVolume !== null) {
        ui.masterVolumeSlider.value = String(masterVolume);
        ui.masterVolumeLabel.textContent = String(masterVolume);
        ui.masterVolumeSlider.dispatchEvent(new Event('input', { bubbles: true }));
    }

    updatePhaseUI(state, ui);
    resetPatterns(state, lanes);

    if (payload.p && typeof payload.p === 'object') {
         // Multi-voice lanes: restore each voice
         const restoreVoiceLane = (lane, voiceData) => {
             if (!Array.isArray(voiceData)) return;
              // Clear existing voices and rebuild from payload
             lane.voices.length = 0;
             voiceData.forEach((vd) => {
                 const voice = { selected: [], buttons: [], nudgeOffset: 0, channel: null, _channelState: vd };
                 voice.selected = new Array(lane.count()).fill(false);
                 applySelectedIndexes(voice.selected, vd.s);
                 voice.nudgeOffset = clampInteger(vd.n, 0, Math.max(0, voice.selected.length - 1)) ?? 0;
                 lane.voices.push(voice);
             });
         };

         restoreVoiceLane(lanes.master, payload.p.m);
         restoreVoiceLane(lanes.Aphrase, payload.p.ap);
         restoreVoiceLane(lanes.Bphrase, payload.p.bp);

        // Single-voice lanes
        if (payload.p.aw) applySelectedIndexes(lanes.Awheel.selected, payload.p.aw.s);
        if (payload.p.bw) applySelectedIndexes(lanes.Bwheel.selected, payload.p.bw.s);
    }

     // Restore fixed channel state
    const fixedChannelMap = {
        driver: 'driver',
        awheel: 'Awheel',
        bwheel: 'Bwheel'
    };
    if (payload.c && typeof payload.c === 'object') {
        Object.entries(fixedChannelMap).forEach(([payloadKey, channelKey]) => {
            applyFixedChannelState(channels[channelKey], payload.c[payloadKey]);
        });
    }

    state.mainAngle = 0;
    resetFlashState(state);
    buildAllLanes(lanes);
}

/** Returns the current app state as a versioned payload for sharing or saving. */
export function createStatePayload(deps) {
    return serializeState(deps);
}

/** Restores a payload object from local storage or another trusted app source. */
export function restoreStatePayload(payload, deps) {
    const migrated = migratePayload(structuredClone(payload));
    restoreFromPayload(migrated, deps);
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
