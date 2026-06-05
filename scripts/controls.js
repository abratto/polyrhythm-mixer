/**
 * controls.js — User interaction wiring.
 *
 * Attaches event listeners to all UI controls (selectors, sliders, buttons)
 * and manages the help modal's visibility and localStorage persistence.
 */

const HELP_MODAL_STORAGE_KEY = 'alans-polyrhythm-mixer-help-dismissed';
const MOBILE_LAYOUT_QUERY = '(max-width: 720px)';

/** Shows the help modal. */
export function openHelpModal(ui) {
    ui.helpModal.classList.remove('hidden');
    ui.helpModal.setAttribute('aria-hidden', 'false');
}

/** Hides the help modal and optionally remembers the dismissal in localStorage. */
export function closeHelpModal(ui, options = {}) {
    ui.helpModal.classList.add('hidden');
    ui.helpModal.setAttribute('aria-hidden', 'true');

    if (options.remember !== false) {
        try {
            localStorage.setItem(HELP_MODAL_STORAGE_KEY, 'true');
        } catch (err) {
            console.warn('Could not persist help modal dismissal.', err);
        }
    }
}

/** Returns true if the help modal should auto-open (user hasn't dismissed it before). */
export function shouldAutoOpenHelpModal() {
    try {
        return localStorage.getItem(HELP_MODAL_STORAGE_KEY) !== 'true';
    } catch (err) {
        return true;
    }
}

/**
 * Wires all UI controls to their corresponding state updates and callbacks.
 * Each selector/slider updates the shared state and triggers a rebuild when needed.
 */
export function wireControls({ ui, state, rebuildSystem, resetAndRebuild, toggleAudio, onShare, onOpenSaveRhythm, onConfirmSaveRhythm, onCloseSaveRhythm, onOpenSavedRhythms, onCloseSavedRhythms }) {
    const advancedRhythm = document.getElementById('advancedRhythm');
    const polyrhythmView = document.getElementById('polyrhythmView');
    const mobileLayout = globalThis.matchMedia(MOBILE_LAYOUT_QUERY);
    const syncResponsiveDisclosureState = () => {
        if (!advancedRhythm) return;
        const shouldOpen = !mobileLayout.matches;
        advancedRhythm.open = shouldOpen;
        if (polyrhythmView) polyrhythmView.open = shouldOpen;
    };

    syncResponsiveDisclosureState();
    mobileLayout.addEventListener('change', syncResponsiveDisclosureState);

    // Meter A/B selectors — changing either recalculates the entire polyrhythm
    ui.selectA.addEventListener('change', () => {
        state.A = parseInt(ui.selectA.value, 10);
        rebuildSystem();
    });

    ui.selectB.addEventListener('change', () => {
        state.B = parseInt(ui.selectB.value, 10);
        rebuildSystem();
    });

    // Phrase cycle selectors — changing either recalculates phrase step counts
    ui.phraseCyclesA.addEventListener('change', () => {
        state.phraseCyclesA = parseInt(ui.phraseCyclesA.value, 10);
        rebuildSystem();
    });

    ui.phraseCyclesB.addEventListener('change', () => {
        state.phraseCyclesB = parseInt(ui.phraseCyclesB.value, 10);
        rebuildSystem();
    });

    // Phase offset sliders — update state and label in real-time
    ui.phaseSliderA.addEventListener('input', () => {
        state.phaseA = parseInt(ui.phaseSliderA.value, 10);
        ui.phaseLabelA.textContent = String(state.phaseA);
    });

    ui.phaseSliderB.addEventListener('input', () => {
        state.phaseB = parseInt(ui.phaseSliderB.value, 10);
        ui.phaseLabelB.textContent = String(state.phaseB);
    });

    // Tempo slider — linear BPM range (30–180), slider value equals BPM directly
    ui.tempoSlider.addEventListener('input', () => {
        state.tempo = parseInt(ui.tempoSlider.value, 10);
        ui.tempoLabel.textContent = String(state.tempo);
    });

    // Master volume slider — updates display label only (read in render loop)
    ui.masterVolumeSlider.addEventListener('input', () => {
        ui.masterVolumeLabel.textContent = String(ui.masterVolumeSlider.value);
    });

    // Reset button — resets animation and patterns without changing settings
    ui.resetBtn.addEventListener('click', resetAndRebuild);

    // Audio toggle — initializes AudioContext on user gesture
    ui.audioBtn.addEventListener('click', async () => {
        await toggleAudio();
    });

    // Help modal controls
    ui.helpBtn.addEventListener('click', () => openHelpModal(ui));
    ui.closeHelpModalBtn.addEventListener('click', () => closeHelpModal(ui));

    // Saved rhythm controls
    ui.saveRhythmBtn.addEventListener('click', () => onOpenSaveRhythm());
    ui.confirmSaveRhythmBtn.addEventListener('click', () => onConfirmSaveRhythm());
    ui.cancelSaveRhythmBtn.addEventListener('click', () => onCloseSaveRhythm());
    ui.loadRhythmBtn.addEventListener('click', () => onOpenSavedRhythms());
    ui.closeSavedRhythmsModalBtn.addEventListener('click', () => onCloseSavedRhythms());

    // Close modal when clicking the backdrop
    ui.helpModal.addEventListener('click', (e) => {
        if (e.target === ui.helpModal) closeHelpModal(ui);
    });
    ui.savedRhythmsModal.addEventListener('click', (e) => {
        if (e.target === ui.savedRhythmsModal) onCloseSavedRhythms();
    });
    ui.saveRhythmModal.addEventListener('click', (e) => {
        if (e.target === ui.saveRhythmModal) onCloseSaveRhythm();
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !ui.helpModal.classList.contains('hidden')) {
            closeHelpModal(ui);
        }
        if (e.key === 'Escape' && !ui.savedRhythmsModal.classList.contains('hidden')) {
            onCloseSavedRhythms();
        }
        if (e.key === 'Escape' && !ui.saveRhythmModal.classList.contains('hidden')) {
            onCloseSaveRhythm();
        }
        if (e.key === 'Enter' && !ui.saveRhythmModal.classList.contains('hidden')) {
            onConfirmSaveRhythm();
        }
    });

    // Share button — encodes current state into a URL
    ui.shareBtn.addEventListener('click', async () => {
        await onShare();
    });
}
