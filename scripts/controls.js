const HELP_MODAL_STORAGE_KEY = 'alans-polyrhythm-mixer-help-dismissed';

export function openHelpModal(ui) {
    ui.helpModal.classList.remove('hidden');
    ui.helpModal.setAttribute('aria-hidden', 'false');
}

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

export function shouldAutoOpenHelpModal() {
    try {
        return localStorage.getItem(HELP_MODAL_STORAGE_KEY) !== 'true';
    } catch (err) {
        return true;
    }
}

export function wireControls({ ui, state, rebuildSystem, resetAndRebuild, toggleAudio, onShare }) {
    ui.selectA.addEventListener('change', () => {
        state.A = parseInt(ui.selectA.value, 10);
        rebuildSystem();
    });

    ui.selectB.addEventListener('change', () => {
        state.B = parseInt(ui.selectB.value, 10);
        rebuildSystem();
    });

    ui.phraseCyclesA.addEventListener('change', () => {
        state.phraseCyclesA = parseInt(ui.phraseCyclesA.value, 10);
        rebuildSystem();
    });

    ui.phraseCyclesB.addEventListener('change', () => {
        state.phraseCyclesB = parseInt(ui.phraseCyclesB.value, 10);
        rebuildSystem();
    });

    ui.phaseSliderA.addEventListener('input', () => {
        state.phaseA = parseInt(ui.phaseSliderA.value, 10);
        ui.phaseLabelA.textContent = String(state.phaseA);
    });

    ui.phaseSliderB.addEventListener('input', () => {
        state.phaseB = parseInt(ui.phaseSliderB.value, 10);
        ui.phaseLabelB.textContent = String(state.phaseB);
    });

    ui.resetBtn.addEventListener('click', resetAndRebuild);

    ui.audioBtn.addEventListener('click', async () => {
        await toggleAudio();
    });

    ui.helpBtn.addEventListener('click', () => openHelpModal(ui));
    ui.closeHelpModalBtn.addEventListener('click', () => closeHelpModal(ui));

    ui.helpModal.addEventListener('click', (e) => {
        if (e.target === ui.helpModal) closeHelpModal(ui);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !ui.helpModal.classList.contains('hidden')) {
            closeHelpModal(ui);
        }
    });

    ui.shareBtn.addEventListener('click', async () => {
        await onShare();
    });
}
