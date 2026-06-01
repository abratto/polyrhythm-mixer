/**
 * share.js — State serialization, URL sharing, and versioned migration.
 *
 * Encodes the current app state into a compact Base64 URL parameter so users
 * can share their configurations. Supports versioned payloads with automatic
 * migration from older formats, and fails silently on invalid data.
 *
 * Payload structure (v1):
 *   { v: 1, m: { A, B, phraseA, ... }, p: { m, ap, aw, bp, bw }, c: { s, v, u } }
 *
 * Migration: v0 payloads (positional array `m`) are automatically converted
 * to v1 (named fields) on load. Future versions (v > current) are rejected.
 */

const SHARE_VERSION = 1;

// Channel order for serializing sound selections, volumes, and mute states
const CHANNEL_ORDER = ['driver', 'custom', 'A', 'Awheel', 'B', 'Bwheel'];

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
 * Uses JSON → UTF-8 bytes → Base64 with URL-safe character replacement.
 */
function encodePayload(payload) {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

/** Decodes a URL-safe Base64 string back into a parsed JSON object. */
function decodePayload(encoded) {
    const base64 = encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
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
            m: selectedIndexes(lanes.master.selected),
            ap: selectedIndexes(lanes.Aphrase.selected),
            aw: selectedIndexes(lanes.Awheel.selected),
            bp: selectedIndexes(lanes.Bphrase.selected),
            bw: selectedIndexes(lanes.Bwheel.selected)
        },
        c: {
            s: CHANNEL_ORDER.map((name) => channels[name].soundEl.value),
            v: CHANNEL_ORDER.map((name) => channels[name].volume),
            u: CHANNEL_ORDER.map((name) => channels[name].muted ? 1 : 0)
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

    // Reject payloads from future versions
    if (payload.v > SHARE_VERSION) {
        throw new Error(`Share payload version ${payload.v} is newer than supported version ${SHARE_VERSION}`);
    }

    return payload;
}

/**
 * Applies channel audio settings (sound selection, volume, mute) from a share payload.
 * Skips channels that no longer exist in the current version.
 */
function applyChannelState(channels, channelState) {
    if (!channelState || typeof channelState !== 'object') return;

    if (Array.isArray(channelState.s)) {
        channelState.s.forEach((sound, idx) => {
            const name = CHANNEL_ORDER[idx];
            if (!name) return;
            const channel = channels[name];
            if (!channel) return;
            const hasSoundOption = Array.from(channel.soundEl.options).some((opt) => opt.value === sound);
            if (typeof sound === 'string' && hasSoundOption) {
                channel.soundEl.value = sound;
            }
        });
    }

    if (Array.isArray(channelState.v)) {
        channelState.v.forEach((volume, idx) => {
            const name = CHANNEL_ORDER[idx];
            if (!name) return;
            const channel = channels[name];
            if (!channel) return;
            if (typeof volume === 'number' && Number.isFinite(volume)) {
                const clampedVolume = Math.max(0, Math.min(1, volume));
                channel.volume = clampedVolume;
                channel.volEl.value = String(clampedVolume);
            }
        });
    }

    if (Array.isArray(channelState.u)) {
        channelState.u.forEach((muted, idx) => {
            const name = CHANNEL_ORDER[idx];
            if (!name) return;
            const channel = channels[name];
            if (!channel) return;
            channel.muted = !!muted;
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        });
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
        applySelectedIndexes(lanes.master.selected, payload.p.m);
        applySelectedIndexes(lanes.Aphrase.selected, payload.p.ap);
        applySelectedIndexes(lanes.Awheel.selected, payload.p.aw);
        applySelectedIndexes(lanes.Bphrase.selected, payload.p.bp);
        applySelectedIndexes(lanes.Bwheel.selected, payload.p.bw);
    }

    applyChannelState(channels, payload.c);

    state.mainAngle = 0;
    resetFlashState(state);
    buildAllLanes(lanes);
}

/** Builds a full share URL with the encoded state as a query parameter. */
function createShareUrl(shareData) {
    const encoded = encodePayload(shareData);
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
    const payload = serializeState(deps);
    const url = createShareUrl(payload);
    await copyToClipboard(url);
    pulseShareButton(deps.ui.shareBtn, 'Copied');
}

/**
 * Checks the URL for a share parameter, decodes and migrates the payload,
 * then restores the app state. Returns false if no share param or if the
 * payload is invalid (app falls back to defaults in that case).
 */
export function loadStateFromUrl(deps) {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('s');
    if (!encoded) return false;

    try {
        const raw = decodePayload(encoded);
        const payload = migratePayload(raw);
        restoreFromPayload(payload, deps);
        return true;
    } catch {
        return false;
    }
}
