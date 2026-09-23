/**
 * audio.js — Top-level audio orchestration and public API facade.
 *
 * This file is intentionally thin. It owns only `toggleAudio` (AudioContext
 * lifecycle) and re-exports the public surface from the sub-modules so that
 * `app.js` and `lanes.js` continue to import from a single entry point.
 *
 *   channels.js   — createChannels, addVoiceChannel, populateMenus,
 *                   populateInstrumentSelect, bindSoloMute, wireChannels,
 *                   refreshSilenced
 *   scheduler.js  — syncAudioStartTime, startAudioScheduler,
 *                   stopAudioScheduler, resetAudioScheduler, playSingleChannel
 *   instruments.js — instrumentCatalog, instruments dispatch table
 */

/**
 * Unlocks an AudioContext inside a user gesture so iOS actually routes audio.
 *
 * iOS keeps WebAudio silent (and the hardware volume keys controlling the
 * ringer, not media) until it sees real media played during a user gesture.
 * Starting a one-sample *silent* buffer is not always enough, so we play a
 * short, very-low-gain noise burst synchronously and resume once. Returns the
 * resume promise so the caller can await a single, in-gesture resume.
 */
function primeAudioContext(ctx) {
    let resumePromise = null;
    try {
        // Safari (iOS 16.4+): route WebAudio to the media channel and allow it
        // to play even when the hardware mute switch is on. Without this, the
        // volume keys control the ringer and WebAudio can stay silent.
        if (navigator.audioSession && 'type' in navigator.audioSession) {
            try { navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
        }
        if (typeof ctx.resume === 'function') resumePromise = ctx.resume();

        const sampleRate = ctx.sampleRate || 44100;
        const length = Math.max(1, Math.floor(sampleRate * 0.06)); // ~60 ms
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        // Extremely low-amplitude noise: enough for the OS to treat it as
        // media, quiet enough to be inaudible.
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.0001;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.01;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
    } catch (err) {
        // Priming is best-effort; never block enabling audio if it fails.
    }
    return resumePromise;
}

/**
 * Toggles audio on/off. Creates the AudioContext on first user gesture
 * (required by browser autoplay policies) and primes/resumes it so iOS
 * actually unlocks the audio session.
 */
export async function toggleAudio(state, ui) {
    try {
        let resumePromise = null;
        if (!state.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioContextClass();
        }
        // Must run synchronously inside the gesture call stack (no await before
        // it) so iOS unlocks the audio session.
        resumePromise = primeAudioContext(state.audioCtx);
        if (resumePromise) {
            await resumePromise;
        } else {
            await state.audioCtx.resume();
        }
        state.audioEnabled = !state.audioEnabled;

        // Activate audio-clock angle derivation on first enable
        if (state.audioEnabled && !state.audioClockActive) {
            state.audioClockActive = true;
            const rps = state.tempo * Math.PI / 120;
            state.audioStartTime = state.audioCtx.currentTime - state.mainAngle / rps;
        }

        ui.audioBtn.classList.toggle('active', state.audioEnabled);
        ui.audioBtn.textContent = state.audioEnabled ? 'Disable Audio' : 'Enable Audio';
        // NOTE: Enable/Disable Audio is purely an output mute (global volume 0).
        // It does NOT touch the transport (playing/transport) — the groove and
        // visualization keep running. Muting is applied by the caller feeding a
        // 0 global volume (see app.js getGlobalVolume).
    } catch (err) {
        console.error('Audio init failed:', err);
    }
}

// ── Re-exports from sub-modules ──────────────────────────────────────────
export {
    createChannels,
    addVoiceChannel,
    populateMenus,
    populateInstrumentSelect,
    bindSoloMute,
    wireChannels,
    refreshSilenced
} from './channels.js';

export {
    syncAudioStartTime,
    startAudioScheduler,
    stopAudioScheduler,
    resetAudioScheduler,
    playSingleChannel
} from './scheduler.js';
