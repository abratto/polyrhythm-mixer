import { createStatePayload, restoreStatePayload } from './share.js';

const SAVED_RHYTHMS_KEY = 'alans-polyrhythm-mixer-saved-rhythms';
const MAX_NAME_LENGTH = 80;

function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `rhythm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

function defaultNameForPayload(payload) {
    const meter = payload?.m ? `${payload.m.A}:${payload.m.B}` : 'Rhythm';
    const tempo = payload?.m?.tempo ? ` ${payload.m.tempo} BPM` : '';
    return `${meter}${tempo}`;
}

function readSavedRhythms() {
    try {
        const raw = localStorage.getItem(SAVED_RHYTHMS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item) => {
            return item &&
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                item.payload &&
                typeof item.payload === 'object';
        });
    } catch (err) {
        console.warn('Could not read saved rhythms.', err);
        return [];
    }
}

function writeSavedRhythms(rhythms) {
    localStorage.setItem(SAVED_RHYTHMS_KEY, JSON.stringify(rhythms));
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function pulseButton(button, label) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = label;
    globalThis.setTimeout(() => {
        button.textContent = original;
    }, 1200);
}

function describePayload(payload) {
    const meters = payload?.m || {};
    const voiceCounts = payload?.p ? [
        Array.isArray(payload.p.m) ? payload.p.m.length : 0,
        Array.isArray(payload.p.ap) ? payload.p.ap.length : 0,
        Array.isArray(payload.p.bp) ? payload.p.bp.length : 0
    ] : [0, 0, 0];

    return `${meters.A || '?'}:${meters.B || '?'} / ${meters.tempo || '?'} BPM / ${voiceCounts.reduce((sum, count) => sum + count, 0)} voices`;
}

export function openSaveRhythmModal(ui, deps) {
    const payload = createStatePayload(deps);
    ui.saveRhythmNameInput.value = defaultNameForPayload(payload);
    ui.saveRhythmModal.classList.remove('hidden');
    ui.saveRhythmModal.setAttribute('aria-hidden', 'false');
    globalThis.setTimeout(() => {
        ui.saveRhythmNameInput.focus();
        ui.saveRhythmNameInput.select();
    }, 0);
}

export function closeSaveRhythmModal(ui) {
    ui.saveRhythmModal.classList.add('hidden');
    ui.saveRhythmModal.setAttribute('aria-hidden', 'true');
}

export function saveCurrentRhythm(deps) {
    try {
        const payload = createStatePayload(deps);
        const defaultName = defaultNameForPayload(payload);
        const name = cleanName(deps.ui.saveRhythmNameInput.value) || defaultName;
        const now = new Date().toISOString();
        const rhythms = readSavedRhythms();

        rhythms.unshift({
            id: createId(),
            name,
            createdAt: now,
            updatedAt: now,
            payload
        });

        writeSavedRhythms(rhythms);
    closeSaveRhythmModal(deps.ui);
        pulseButton(deps.ui.saveRhythmBtn, 'Saved');
    } catch (err) {
        console.error('Save rhythm failed:', err);
        pulseButton(deps.ui.saveRhythmBtn, 'Error');
    }
}

export function closeSavedRhythmsModal(ui) {
    ui.savedRhythmsModal.classList.add('hidden');
    ui.savedRhythmsModal.setAttribute('aria-hidden', 'true');
}

function renderEmptyState(ui) {
    ui.savedRhythmsList.innerHTML = '';
    ui.savedRhythmsStatus.textContent = 'No saved rhythms yet.';
}

function renderRhythmItem({ ui, rhythm, deps, onAfterLoad, rerender }) {
    const row = document.createElement('div');
    row.className = 'saved-rhythm-item';

    const details = document.createElement('div');
    details.className = 'saved-rhythm-details';

    const name = document.createElement('div');
    name.className = 'saved-rhythm-name';
    name.textContent = rhythm.name;

    const meta = document.createElement('div');
    meta.className = 'saved-rhythm-meta';
    meta.textContent = `${describePayload(rhythm.payload)} / Updated ${formatDate(rhythm.updatedAt)}`;

    details.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'saved-rhythm-actions';

    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load';
    loadButton.className = 'saved-rhythm-load-btn';
    loadButton.addEventListener('click', () => {
        try {
            restoreStatePayload(rhythm.payload, deps);
            onAfterLoad();
            closeSavedRhythmsModal(ui);
        } catch (err) {
            console.error('Load rhythm failed:', err);
            ui.savedRhythmsStatus.textContent = 'Could not load that rhythm.';
        }
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'saved-rhythm-delete-btn';
    deleteButton.addEventListener('click', () => {
        if (deleteButton.dataset.confirming !== 'true') {
            deleteButton.dataset.confirming = 'true';
            deleteButton.textContent = 'Confirm';
            globalThis.setTimeout(() => {
                deleteButton.dataset.confirming = 'false';
                deleteButton.textContent = 'Delete';
            }, 2500);
            return;
        }

        writeSavedRhythms(readSavedRhythms().filter(item => item.id !== rhythm.id));
        rerender();
    });

    actions.append(loadButton, deleteButton);
    row.append(details, actions);
    ui.savedRhythmsList.appendChild(row);
}

function renderSavedRhythms(ui, deps, onAfterLoad) {
    const rhythms = readSavedRhythms();
    if (rhythms.length === 0) {
        renderEmptyState(ui);
        return;
    }

    ui.savedRhythmsList.innerHTML = '';
    ui.savedRhythmsStatus.textContent = `${rhythms.length} saved rhythm${rhythms.length === 1 ? '' : 's'}`;

    const rerender = () => renderSavedRhythms(ui, deps, onAfterLoad);
    rhythms.forEach((rhythm) => {
        renderRhythmItem({ ui, rhythm, deps, onAfterLoad, rerender });
    });
}

export function openSavedRhythmsModal(ui, deps, onAfterLoad) {
    renderSavedRhythms(ui, deps, onAfterLoad);
    ui.savedRhythmsModal.classList.remove('hidden');
    ui.savedRhythmsModal.setAttribute('aria-hidden', 'false');
}