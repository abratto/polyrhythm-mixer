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
 * Toggles audio on/off. Creates the AudioContext on first user gesture
 * (required by browser autoplay policies) and resumes it if suspended.
 */
export async function toggleAudio(state, ui) {
    try {
        if (!state.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioContextClass();
        }
        if (state.audioCtx.state === 'suspended') {
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
