const CHANNEL_ORDER = ['driver', 'custom', 'A', 'Awheel', 'B', 'Bwheel'];

function clampInteger(value, min, max) {
    if (!Number.isInteger(value)) return null;
    return Math.min(max, Math.max(min, value));
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

function serializeState({ state, lanes, channels, ui }) {
    return {
        m: [state.A, state.B, state.phraseCyclesA, state.phraseCyclesB, state.phaseA, state.phaseB, parseFloat(ui.speedSlider.value)],
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

function applyChannelState(channels, channelState) {
    if (!channelState || typeof channelState !== 'object') return;

    if (Array.isArray(channelState.s)) {
        channelState.s.forEach((sound, idx) => {
            const name = CHANNEL_ORDER[idx];
            if (!name) return;
            const channel = channels[name];
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
            channel.muted = !!muted;
            channel.muteEl.classList.toggle('muted', channel.muted);
            channel.muteEl.textContent = channel.muted ? 'Muted' : 'Mute';
        });
    }
}

export function restoreFromPayload(payload, deps) {
    const { state, ui, lanes, channels, updateDerivedState, updatePhaseUI, resetPatterns, buildAllLanes, resetFlashState } = deps;
    if (!payload || typeof payload !== 'object') return;

    const meters = Array.isArray(payload.m) ? payload.m : [];

    const a = clampInteger(meters[0], 2, 16);
    const b = clampInteger(meters[1], 2, 16);
    const phraseA = clampInteger(meters[2], 1, 4);
    const phraseB = clampInteger(meters[3], 1, 4);

    if (a !== null) state.A = a;
    if (b !== null) state.B = b;
    if (phraseA !== null) state.phraseCyclesA = phraseA;
    if (phraseB !== null) state.phraseCyclesB = phraseB;

    ui.selectA.value = String(state.A);
    ui.selectB.value = String(state.B);
    ui.phraseCyclesA.value = String(state.phraseCyclesA);
    ui.phraseCyclesB.value = String(state.phraseCyclesB);

    updateDerivedState(state);

    const phaseA = clampInteger(meters[4], 0, state.mainTeeth - 1);
    const phaseB = clampInteger(meters[5], 0, state.mainTeeth - 1);

    if (phaseA !== null) state.phaseA = phaseA;
    if (phaseB !== null) state.phaseB = phaseB;

    ui.phaseSliderA.value = String(state.phaseA);
    ui.phaseSliderB.value = String(state.phaseB);

    const tempo = meters[6];
    if (typeof tempo === 'number' && Number.isFinite(tempo)) {
        ui.speedSlider.value = String(Math.max(1, Math.min(10, tempo)));
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
        const payload = decodePayload(encoded);
        restoreFromPayload(payload, deps);
        return true;
    } catch (err) {
        console.warn('Could not load shared state from URL.', err);
        return false;
    }
}
