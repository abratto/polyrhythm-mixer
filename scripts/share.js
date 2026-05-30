const SHARE_VERSION = 1;

const CHANNEL_ORDER = ['driver', 'custom', 'A', 'Awheel', 'B', 'Bwheel'];

function clampInteger(value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const int = Math.round(value);
    return Math.min(max, Math.max(min, int));
}

function selectedIndexes(values) {
    const indexes = [];
    values.forEach((on, i) => {
        if (on) indexes.push(i);
    });
    return indexes;
}

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

function migratePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid share payload');
    }

    if (!payload.v) {
        payload = migrateV0toV1(payload);
    }

    if (payload.v > SHARE_VERSION) {
        throw new Error(`Share payload version ${payload.v} is newer than supported version ${SHARE_VERSION}`);
    }

    return payload;
}

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

function createShareUrl(shareData) {
    const encoded = encodePayload(shareData);
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('s', encoded);
    return url.toString();
}

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

function pulseShareButton(button, label) {
    const original = button.textContent;
    button.textContent = label;
    window.setTimeout(() => {
        button.textContent = original;
    }, 1200);
}

export async function copyShareLink(deps) {
    const payload = serializeState(deps);
    const url = createShareUrl(payload);
    await copyToClipboard(url);
    pulseShareButton(deps.ui.shareBtn, 'Copied');
}

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
