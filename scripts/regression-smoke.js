#!/usr/bin/env node
/**
 * regression-smoke.js — reusable browser regression harness for Polyrhythm Mixer.
 *
 * Purpose:
 *   This script captures the manual verification flow we use before committing UI,
 *   save/load, share-link, or sequencer changes. It is intentionally written as a
 *   single file with explicit selectors and comments so another agent can pick it
 *   up in a future session without reconstructing the test from chat history.
 *
 * One-time setup:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *
 * Run:
 *   node scripts/regression-smoke.js
 *
 * Optional environment variables:
 *   PORT=8000             Port used for the temporary static server.
 *   BASE_URL=http://...   Use an already-running server instead of starting one.
 *   HEADFUL=1             Show Chromium while the test runs.
 *
 * What this verifies:
 *   - default first-pulse selections for Master Cycle, Meter A, and Meter B voice 1
 *   - Master Click label and mixer state
 *   - help modal lead text formatting
 *   - Reset Mixer restores the startup meter, voice, pattern, and mixer state
 *   - current save/load from a fresh page, including voices, nudges, mixer settings,
 *     and Master Volume
 *   - current share URL restore from a fresh page
 *   - legacy saved payload migration
 *   - legacy share URL migration
 *
 * Maintenance notes for future agents:
 *   - Keep selectors close to the real UI names. If a control is renamed, update the
 *     selector here in the same commit as the UI change.
 *   - Keep the assertions behavioral rather than screenshot-based. This app's most
 *     important regressions usually show up as state/persistence mismatches.
 *   - Do not leave test rhythms in localStorage. The harness snapshots and restores
 *     the saved-rhythms key in a finally block.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (err) {
    console.error('Playwright is required for this smoke test.');
    console.error('Run: npm install --save-dev playwright && npx playwright install chromium');
    process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PORT || '8000', 10);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const SAVED_RHYTHMS_KEY = 'alans-polyrhythm-mixer-saved-rhythms';
const HELP_STORAGE_KEY = 'alans-polyrhythm-mixer-help-dismissed';

function contentTypeFor(filePath) {
    if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
    if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
    if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
    return 'application/octet-stream';
}

function startStaticServer() {
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, BASE_URL);
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        const filePath = path.normalize(path.join(ROOT, pathname));

        if (!filePath.startsWith(ROOT)) {
            response.writeHead(403);
            response.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                response.writeHead(404);
                response.end('Not found');
                return;
            }
            response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
            response.end(data);
        });
    });

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(PORT, '127.0.0.1', () => resolve(server));
    });
}

function encodeLegacyPayload(payload) {
    return Buffer.from(JSON.stringify(payload), 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function same(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

function assert(condition, message, details = undefined) {
    if (condition) return;
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;
    throw new Error(`${message}${suffix}`);
}

async function run() {
    const server = process.env.BASE_URL ? null : await startStaticServer();
    const browser = await chromium.launch({ headless: process.env.HEADFUL !== '1' });
    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    let baselineSavedRaw = null;

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.addInitScript(({ helpKey }) => {
        localStorage.setItem(helpKey, 'true');
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async (text) => {
                    globalThis.__lastCopiedShareUrl = text;
                }
            }
        });
        globalThis.__audioParamValues = [];
        const recordAudioParamValue = (value) => {
            if (typeof value === 'number' && value > 0 && value <= 1) {
                globalThis.__audioParamValues.push(value);
            }
        };
        if (globalThis.AudioParam) {
            const originalSetValueAtTime = globalThis.AudioParam.prototype.setValueAtTime;
            const originalLinearRampToValueAtTime = globalThis.AudioParam.prototype.linearRampToValueAtTime;
            const originalExponentialRampToValueAtTime = globalThis.AudioParam.prototype.exponentialRampToValueAtTime;
            globalThis.AudioParam.prototype.setValueAtTime = function (value, startTime) {
                recordAudioParamValue(value);
                return originalSetValueAtTime.call(this, value, startTime);
            };
            globalThis.AudioParam.prototype.linearRampToValueAtTime = function (value, endTime) {
                recordAudioParamValue(value);
                return originalLinearRampToValueAtTime.call(this, value, endTime);
            };
            globalThis.AudioParam.prototype.exponentialRampToValueAtTime = function (value, endTime) {
                recordAudioParamValue(value);
                return originalExponentialRampToValueAtTime.call(this, value, endTime);
            };
        }
    }, { helpKey: HELP_STORAGE_KEY });

    const waitForApp = async () => {
        await page.waitForSelector('#masterGrid .voice-row:first-child .step-btn', { timeout: 10000 });
        await page.waitForSelector('#masterVoiceContainer select', { timeout: 10000 });
    };

    const snapshot = async () => page.evaluate(() => {
        const activeIndexesFor = (selector) => Array.from(document.querySelectorAll(selector)).map(button => Array.from(button.parentElement.children).indexOf(button));
        const selectValue = (selector) => document.querySelector(selector)?.value ?? null;
        const muteText = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;

        return {
            meters: {
                A: selectValue('#rhythmA'),
                B: selectValue('#rhythmB'),
                phraseA: selectValue('#phraseCyclesA'),
                phraseB: selectValue('#phraseCyclesB'),
                tempo: document.querySelector('#tempoSlider')?.value ?? null,
                masterVolume: document.querySelector('#masterVolumeSlider')?.value ?? null
            },
            voiceCounts: {
                master: document.querySelectorAll('#masterGrid .voice-row').length,
                A: document.querySelectorAll('#meterAPhraseGrid .voice-row').length,
                B: document.querySelectorAll('#meterBPhraseGrid .voice-row').length,
                masterMixer: document.querySelectorAll('#masterVoiceContainer .mixer-strip').length,
                AMixer: document.querySelectorAll('#AVoiceContainer .mixer-strip').length,
                BMixer: document.querySelectorAll('#BVoiceContainer .mixer-strip').length
            },
            active: {
                master1: activeIndexesFor('#masterGrid .voice-row:nth-child(1) .step-btn.active'),
                master2: activeIndexesFor('#masterGrid .voice-row:nth-child(2) .step-btn.active'),
                A1: activeIndexesFor('#meterAPhraseGrid .voice-row:nth-child(1) .step-btn.active'),
                A2: activeIndexesFor('#meterAPhraseGrid .voice-row:nth-child(2) .step-btn.active'),
                B1: activeIndexesFor('#meterBPhraseGrid .voice-row:nth-child(1) .step-btn.active'),
                B2: activeIndexesFor('#meterBPhraseGrid .voice-row:nth-child(2) .step-btn.active')
            },
            mixer: {
                masterClickHeader: document.querySelector('.fixed-controls-row .mixer-strip .strip-header')?.textContent?.trim() ?? null,
                masterClickSound: selectValue('#soundDriver'),
                masterClickMute: muteText('#muteDriver'),
                masterVoice1Sound: selectValue('#sound_master_0'),
                masterVoice2Sound: selectValue('#sound_master_1'),
                AVoice1Sound: selectValue('#sound_A_0'),
                BVoice1Sound: selectValue('#sound_B_0')
            },
            voiceLabels: {
                master1: document.querySelector('#masterGrid .voice-row:nth-child(1) .voice-instrument-label')?.textContent?.trim() ?? null,
                master2: document.querySelector('#masterGrid .voice-row:nth-child(2) .voice-instrument-label')?.textContent?.trim() ?? null,
                A1: document.querySelector('#meterAPhraseGrid .voice-row:nth-child(1) .voice-instrument-label')?.textContent?.trim() ?? null,
                A2: document.querySelector('#meterAPhraseGrid .voice-row:nth-child(2) .voice-instrument-label')?.textContent?.trim() ?? null,
                B1: document.querySelector('#meterBPhraseGrid .voice-row:nth-child(1) .voice-instrument-label')?.textContent?.trim() ?? null,
                B2: document.querySelector('#meterBPhraseGrid .voice-row:nth-child(2) .voice-instrument-label')?.textContent?.trim() ?? null
            },
            helpLeads: Array.from(document.querySelectorAll('#helpModal .modal-help-item > strong:first-child')).map(node => node.textContent.trim())
        };
    });

    const setSelect = async (selector, value) => {
        await page.selectOption(selector, String(value));
        await page.locator(selector).dispatchEvent('change');
    };

    const setRange = async (selector, value) => {
        await page.locator(selector).evaluate((element, nextValue) => {
            element.value = String(nextValue);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
    };

    const clickStep = async (gridSelector, row, index) => {
        await page.locator(`${gridSelector} .voice-row:nth-child(${row}) .step-btn`).nth(index).click();
    };

    const legacyPayload = {
        v: 1,
        m: { A: 3, B: 4, phraseA: 1, phraseB: 1, phaseA: 0, phaseB: 0, tempo: 96 },
        p: { m: [0], ap: [0, 2], aw: [0, 1, 2], bp: [0, 3], bw: [0, 1, 2, 3] },
        c: {
            s: ['shaker', 'kick', 'woodblock', 'rimshot', 'cowbell', 'claves'],
            v: [0.6, 0.5, 0.5, 0.45, 0.5, 0.35],
            u: [0, 0, 0, 0, 0, 0]
        }
    };
    const legacyShareUrl = `${BASE_URL}/?s=${encodeLegacyPayload(legacyPayload)}`;

    try {
        await page.goto(`${BASE_URL}/?cache-bust=regression-prep-${Date.now()}`, { waitUntil: 'networkidle' });
        baselineSavedRaw = await page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const cleaned = JSON.parse(raw).filter(item => !String(item?.name || '').startsWith('Regression Save ') && !String(item?.name || '').startsWith('Legacy Save '));
            return JSON.stringify(cleaned);
        }, SAVED_RHYTHMS_KEY);

        if (baselineSavedRaw === null) {
            await page.evaluate((key) => localStorage.removeItem(key), SAVED_RHYTHMS_KEY);
        } else {
            await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: SAVED_RHYTHMS_KEY, value: baselineSavedRaw });
        }

        await page.goto(`${BASE_URL}/?cache-bust=regression-start-${Date.now()}`, { waitUntil: 'networkidle' });
        await waitForApp();
        const initial = await snapshot();

        assert(same(initial.active.master1, [0]), 'Master Cycle voice 1 should start on pulse 1.', initial.active.master1);
        assert(same(initial.active.A1, [0]), 'Meter A voice 1 should start on pulse 1.', initial.active.A1);
        assert(same(initial.active.B1, [0]), 'Meter B voice 1 should start on pulse 1.', initial.active.B1);
        assert(initial.mixer.masterClickHeader === 'Master Click', 'Master Click strip should be present.', initial.mixer);
        assert(initial.voiceLabels.master1 === 'Bass Drum (Kick)' && initial.voiceLabels.A1 === 'Woodblock Clack' && initial.voiceLabels.B1 === 'Analog Cowbell', 'Voice rows should display their default mixer instruments.', initial.voiceLabels);
        assert(initial.helpLeads.length === 4, 'Help modal should expose four bold lead sentences.', initial.helpLeads);
        assert(await page.locator('#resetBtn').textContent() === 'Reset Mixer', 'Reset button should clearly describe full mixer reset.');
        const bataOptions = await page.locator('#soundDriver option').evaluateAll(options => options
            .map(option => ({ value: option.value, label: option.textContent.trim() }))
            .filter(option => option.value.startsWith('bata_')));
        assert(same(bataOptions, [
            { value: 'bata_low', label: 'Batá Drum (Low)' },
            { value: 'bata_middle', label: 'Batá Drum (Middle)' },
            { value: 'bata_high', label: 'Batá Drum (High)' },
            { value: 'bata_slap', label: 'Batá Slap' },
            { value: 'bata_high_slap', label: 'Batá Slap (High)' },
            { value: 'bata_low_slap', label: 'Batá Slap (Low)' },
            { value: 'bata_middle_slap', label: 'Batá Slap (Middle)' }
        ]), 'Mixer menus should expose low, middle, high, and slap Batá sounds.', bataOptions);
        const congaOptions = await page.locator('#soundDriver option').evaluateAll(options => options
            .map(option => ({ value: option.value, label: option.textContent.trim() }))
            .filter(option => option.value.startsWith('conga_')));
        assert(same(congaOptions, [
            { value: 'conga_high', label: 'Conga (High)' },
            { value: 'conga_low', label: 'Conga (Low)' },
            { value: 'conga_middle', label: 'Conga (Middle)' },
            { value: 'conga_slap', label: 'Conga Slap' }
        ]), 'Mixer menus should expose low, middle, high, and slap conga sounds.', congaOptions);
        const expandedPercussionOptions = await page.locator('#soundDriver option').evaluateAll(options => options
            .map(option => ({ value: option.value, label: option.textContent.trim() }))
            .filter(option => ['cabasa_shekere', 'gankogui', 'guiro', 'talking_drum', 'temple_block', 'triangle', 'udu'].includes(option.value)));
        assert(same(expandedPercussionOptions, [
            { value: 'cabasa_shekere', label: 'Cabasa / Shekere' },
            { value: 'gankogui', label: 'Gankogui Double Bell' },
            { value: 'guiro', label: 'Guiro Scraper' },
            { value: 'talking_drum', label: 'Talking Drum' },
            { value: 'temple_block', label: 'Temple Block' },
            { value: 'triangle', label: 'Triangle' },
            { value: 'udu', label: 'Udu Clay Pot' }
        ]), 'Mixer menus should expose the expanded percussion palette.', expandedPercussionOptions);

        // --- Button highlight advancement ---
        // Enable audio so the animation and scheduler both run, then verify
        // step highlighting advances over time.
        await page.locator('#audioBtn').click();
        await page.waitForTimeout(2500);

        const snapshotHighlight = async () => page.evaluate(() => {
            const currentClassCount = (gridSelector) => document.querySelectorAll(`${gridSelector} .step-btn.current`).length;
            const currentBtnIndex = (gridSelector) => {
                const buttons = document.querySelectorAll(`${gridSelector} .step-btn`);
                return Array.from(buttons).findIndex(btn => btn.classList.contains('current'));
            };
            return {
                masterCt: currentClassCount('#masterGrid'),
                AphrCt: currentClassCount('#meterAPhraseGrid'),
                BphrCt: currentClassCount('#meterBPhraseGrid'),
                AwheelIdx: currentBtnIndex('#meterAWheelGrid'),
                BwheelIdx: currentBtnIndex('#meterBWheelGrid'),
                masterIdx: currentBtnIndex('#masterGrid'),
                AphrIdx: currentBtnIndex('#meterAPhraseGrid'),
                BphrIdx: currentBtnIndex('#meterBPhraseGrid')
            };
        });

        const hl1 = await snapshotHighlight();

        assert(hl1.masterCt >= 1, 'At least one master step button should be highlighted');
        assert(hl1.AphrCt >= 1, 'At least one A-phrase step button should be highlighted');
        assert(hl1.BphrCt >= 1, 'At least one B-phrase step button should be highlighted');
        assert(hl1.AwheelIdx >= 0, 'A-wheel step button should be highlighted', hl1);
        assert(hl1.BwheelIdx >= 0, 'B-wheel step button should be highlighted', hl1);

        // Wait more and verify the highlighted step has advanced
        await page.waitForTimeout(2000);
        const hl2 = await snapshotHighlight();

        assert(hl2.masterIdx !== hl1.masterIdx,
            'Master step highlight should advance over time',
            { before: hl1, after: hl2 });

        const maxRecordedGain = async () => page.evaluate(() => Math.max(...globalThis.__audioParamValues, 0));
        const clearRecordedGains = async () => page.evaluate(() => { globalThis.__audioParamValues = []; });

        await setRange('#masterVolumeSlider', 100);
        await page.waitForTimeout(200);
        await clearRecordedGains();
        await page.waitForTimeout(1500);
        const highMasterVolumeGain = await maxRecordedGain();

        await setRange('#masterVolumeSlider', 5);
        await page.waitForTimeout(200);
        await clearRecordedGains();
        await page.waitForTimeout(1500);
        const lowMasterVolumeGain = await maxRecordedGain();

        assert(highMasterVolumeGain > 0.05, 'High Master Volume should produce audible gain automation.', { highMasterVolumeGain, lowMasterVolumeGain });
        assert(lowMasterVolumeGain < highMasterVolumeGain * 0.25, 'Master Volume changes while audio is running should affect newly scheduled hits.', { highMasterVolumeGain, lowMasterVolumeGain });

        // --- Reset restores a single voice per lane ---
        await setSelect('#rhythmA', 5);
        await setSelect('#rhythmB', 7);
        await setSelect('#phraseCyclesA', 2);
        await setSelect('#phraseCyclesB', 2);
        await setRange('#tempoSlider', 118);
        await setRange('#masterVolumeSlider', 72);
        await setSelect('#soundDriver', 'cowbell');
        await setSelect('#sound_master_0', 'snare');
        await page.locator('#addMasterVoiceBtn').click();
        await page.locator('#addAPhraseVoiceBtn').click();
        await page.locator('#addBPhraseVoiceBtn').click();
        await setSelect('#sound_master_1', 'claves');
        await setSelect('#sound_A_0', 'woodblock');
        await setSelect('#sound_B_0', 'cowbell');

        const liveInstrumentLabels = await snapshot();
        assert(liveInstrumentLabels.voiceLabels.master1 === 'Snare Drum' && liveInstrumentLabels.voiceLabels.master2 === 'Claves' && liveInstrumentLabels.voiceLabels.A1 === 'Woodblock Clack' && liveInstrumentLabels.voiceLabels.B1 === 'Analog Cowbell', 'Voice row instrument labels should update when mixer selections change.', liveInstrumentLabels.voiceLabels);

        await clickStep('#masterGrid', 1, 3);
        await clickStep('#masterGrid', 1, 8);
        await clickStep('#masterGrid', 2, 2);
        await clickStep('#masterGrid', 2, 6);
        await clickStep('#meterAPhraseGrid', 1, 4);
        await clickStep('#meterAPhraseGrid', 1, 8);
        await clickStep('#meterAPhraseGrid', 2, 1);
        await clickStep('#meterAPhraseGrid', 2, 6);
        await clickStep('#meterBPhraseGrid', 1, 5);
        await clickStep('#meterBPhraseGrid', 1, 10);
        await clickStep('#meterBPhraseGrid', 2, 3);
        await clickStep('#meterBPhraseGrid', 2, 9);

        await page.locator('#masterGrid .voice-row:nth-child(2) .voice-nudge-btn[title="Shift Voice 2 right"]').click();
        await page.locator('#meterAPhraseGrid .voice-row:nth-child(1) .voice-nudge-btn[title="Shift Voice 1 right"]').click();
        await page.locator('#meterBPhraseGrid .voice-row:nth-child(2) .voice-nudge-btn[title="Shift Voice 2 left"]').click();

        const expectedCurrent = await snapshot();

        await page.locator('#resetBtn').click();
        await page.waitForFunction(() => document.querySelectorAll('#masterGrid .voice-row').length === 1);
        assert(same(await snapshot(), initial), 'Reset Mixer should restore the startup state after meter, voice, pattern, nudge, and mixer edits.', { expected: initial, actual: await snapshot() });

        await setSelect('#rhythmA', 5);
        await setSelect('#rhythmB', 7);
        await setSelect('#phraseCyclesA', 2);
        await setSelect('#phraseCyclesB', 2);
        await setRange('#tempoSlider', 118);
        await setRange('#masterVolumeSlider', 72);
        await setSelect('#soundDriver', 'cowbell');
        await setSelect('#sound_master_0', 'snare');
        await page.locator('#addMasterVoiceBtn').click();
        await page.locator('#addAPhraseVoiceBtn').click();
        await page.locator('#addBPhraseVoiceBtn').click();
        await setSelect('#sound_master_1', 'claves');
        await setSelect('#sound_A_0', 'woodblock');
        await setSelect('#sound_B_0', 'cowbell');

        await clickStep('#masterGrid', 1, 3);
        await clickStep('#masterGrid', 1, 8);
        await clickStep('#masterGrid', 2, 2);
        await clickStep('#masterGrid', 2, 6);
        await clickStep('#meterAPhraseGrid', 1, 4);
        await clickStep('#meterAPhraseGrid', 1, 8);
        await clickStep('#meterAPhraseGrid', 2, 1);
        await clickStep('#meterAPhraseGrid', 2, 6);
        await clickStep('#meterBPhraseGrid', 1, 5);
        await clickStep('#meterBPhraseGrid', 1, 10);
        await clickStep('#meterBPhraseGrid', 2, 3);
        await clickStep('#meterBPhraseGrid', 2, 9);

        await page.locator('#masterGrid .voice-row:nth-child(2) .voice-nudge-btn[title="Shift Voice 2 right"]').click();
        await page.locator('#meterAPhraseGrid .voice-row:nth-child(1) .voice-nudge-btn[title="Shift Voice 1 right"]').click();
        await page.locator('#meterBPhraseGrid .voice-row:nth-child(2) .voice-nudge-btn[title="Shift Voice 2 left"]').click();

        const testName = `Regression Save ${Date.now()}`;

        await page.locator('#saveRhythmBtn').click();
        await page.locator('#saveRhythmNameInput').fill(testName);
        await page.locator('#confirmSaveRhythmBtn').click();
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('alans-polyrhythm-mixer-saved-rhythms') || '[]').some(item => String(item.name || '').startsWith('Regression Save ')));

        const savedPayload = await page.evaluate(({ key, name }) => JSON.parse(localStorage.getItem(key)).find(item => item.name === name)?.payload, { key: SAVED_RHYTHMS_KEY, name: testName });
        assert(savedPayload?.v === 3, 'Saved rhythm should use the current payload version.', savedPayload);
        assert(savedPayload?.m?.masterVolume === 72, 'Saved rhythm should include Master Volume.', savedPayload?.m);
        assert(!!(savedPayload?.p?.m?.some(v => v.n) || savedPayload?.p?.ap?.some(v => v.n) || savedPayload?.p?.bp?.some(v => v.n)), 'Saved rhythm should include nudge offsets.', savedPayload?.p);

        await page.goto(`${BASE_URL}/?cache-bust=save-fresh-load-${Date.now()}`, { waitUntil: 'networkidle' });
        await waitForApp();
        await page.locator('#loadRhythmBtn').click();
        await page.locator('.saved-rhythm-item', { hasText: testName }).locator('.saved-rhythm-load-btn').click();
        await page.waitForFunction(() => document.querySelector('#savedRhythmsModal')?.classList.contains('hidden'));
        assert(same(await snapshot(), expectedCurrent), 'Fresh-page saved rhythm load should restore the current state.', { expected: expectedCurrent, actual: await snapshot() });

        await page.locator('#shareBtn').click();
        await page.waitForFunction(() => globalThis.__lastCopiedShareUrl && globalThis.__lastCopiedShareUrl.includes('?s='));
        const currentShareUrl = await page.evaluate(() => globalThis.__lastCopiedShareUrl);
        await page.goto(currentShareUrl, { waitUntil: 'networkidle' });
        await waitForApp();
        assert(same(await snapshot(), expectedCurrent), 'Current share URL should restore the current state.', { expected: expectedCurrent, actual: await snapshot() });

        const legacySaveName = `Legacy Save ${Date.now()}`;
        await page.evaluate(({ key, originalRaw, legacyName, payload }) => {
            const rhythms = originalRaw ? JSON.parse(originalRaw) : [];
            rhythms.unshift({ id: 'legacy-regression-save', name: legacyName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), payload });
            localStorage.setItem(key, JSON.stringify(rhythms));
        }, { key: SAVED_RHYTHMS_KEY, originalRaw: baselineSavedRaw, legacyName: legacySaveName, payload: legacyPayload });

        await page.goto(`${BASE_URL}/?cache-bust=legacy-save-${Date.now()}`, { waitUntil: 'networkidle' });
        await waitForApp();
        await page.locator('#loadRhythmBtn').click();
        await page.locator('.saved-rhythm-item', { hasText: legacySaveName }).locator('.saved-rhythm-load-btn').click();
        await page.waitForFunction(() => document.querySelector('#savedRhythmsModal')?.classList.contains('hidden'));
        const legacySaved = await snapshot();
        assert(legacySaved.meters.A === '3' && legacySaved.meters.B === '4' && legacySaved.meters.tempo === '96', 'Legacy saved payload should migrate meter settings.', legacySaved);
        assert(same(legacySaved.active.master1, [0]) && same(legacySaved.active.A1, [0, 2]) && same(legacySaved.active.B1, [0, 3]), 'Legacy saved payload should migrate patterns.', legacySaved.active);

        await page.goto(legacyShareUrl, { waitUntil: 'networkidle' });
        await waitForApp();
        const legacyShared = await snapshot();
        assert(legacyShared.meters.A === '3' && legacyShared.meters.B === '4' && legacyShared.meters.tempo === '96', 'Legacy share URL should migrate meter settings.', legacyShared);
        assert(same(legacyShared.active.master1, [0]) && same(legacyShared.active.A1, [0, 2]) && same(legacyShared.active.B1, [0, 3]), 'Legacy share URL should migrate patterns.', legacyShared.active);

        assert(pageErrors.length === 0, 'No page errors should be emitted.', pageErrors);
        assert(consoleErrors.length === 0, 'No console errors should be emitted.', consoleErrors);

        console.log('Regression smoke passed.');
    } finally {
        if (baselineSavedRaw === null) {
            await page.evaluate((key) => localStorage.removeItem(key), SAVED_RHYTHMS_KEY).catch(() => {});
        } else {
            await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: SAVED_RHYTHMS_KEY, value: baselineSavedRaw }).catch(() => {});
        }
        await browser.close();
        if (server) await new Promise(resolve => server.close(resolve));
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});