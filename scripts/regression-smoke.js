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
 *   - default first-pulse selections for Master, Meter A, and Meter B voice 1
 *   - Master label and mixer state
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
        // Tag GainNode gain params so the volume assertion only samples actual
        // output gains, not filter Q / frequency values that also fall in (0,1].
        const tagGainParams = (Ctor) => {
            if (!Ctor || !Ctor.prototype || !Ctor.prototype.createGain) return;
            const originalCreateGain = Ctor.prototype.createGain;
            Ctor.prototype.createGain = function (...args) {
                const node = originalCreateGain.apply(this, args);
                if (node && node.gain) node.gain.__isGainParam = true;
                return node;
            };
        };
        tagGainParams(globalThis.AudioContext);
        tagGainParams(globalThis.webkitAudioContext);
        tagGainParams(globalThis.OfflineAudioContext);
        tagGainParams(globalThis.webkitOfflineAudioContext);
        if (globalThis.AudioParam) {
            const originalSetValueAtTime = globalThis.AudioParam.prototype.setValueAtTime;
            const originalLinearRampToValueAtTime = globalThis.AudioParam.prototype.linearRampToValueAtTime;
            const originalExponentialRampToValueAtTime = globalThis.AudioParam.prototype.exponentialRampToValueAtTime;
            globalThis.AudioParam.prototype.setValueAtTime = function (value, startTime) {
                if (this.__isGainParam) recordAudioParamValue(value);
                return originalSetValueAtTime.call(this, value, startTime);
            };
            globalThis.AudioParam.prototype.linearRampToValueAtTime = function (value, endTime) {
                if (this.__isGainParam) recordAudioParamValue(value);
                return originalLinearRampToValueAtTime.call(this, value, endTime);
            };
            globalThis.AudioParam.prototype.exponentialRampToValueAtTime = function (value, endTime) {
                if (this.__isGainParam) recordAudioParamValue(value);
                return originalExponentialRampToValueAtTime.call(this, value, endTime);
            };
        }
    }, { helpKey: HELP_STORAGE_KEY });

    const waitForApp = async () => {
        await page.waitForSelector('#masterGrid .voice-row:first-child .step-btn', { timeout: 10000 });
        await page.waitForSelector('#sound_master_0', { timeout: 10000 });
    };

    const snapshot = async () => page.evaluate(() => {
        const activeIndexesFor = (selector) => Array.from(document.querySelectorAll(selector)).map(button => Array.from(button.parentElement.children).indexOf(button));
        const selectValue = (selector) => document.querySelector(selector)?.value ?? null;
        const selectText = (selector) => document.querySelector(selector)?.selectedOptions?.[0]?.textContent?.trim() ?? null;
        const muteText = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;

        // Grouping lane selectors — lane N, voice M. The A/B names map to the
        // first two grouping lanes so downstream assertions stay readable.
        const gl = (lane, voice, sel) => `#groupingLanesContainer .grouping-lane-row:nth-child(${lane}) .sequencer-container > .voice-row[data-voice-index="${voice - 1}"] ${sel}`;
        const groupingRows = Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-lane-row'));

        return {
            meters: {
                A: selectValue('#rhythmA'),
                B: selectValue('#rhythmB'),
                beatScheme: document.querySelector('#beatSchemeSummary')?.textContent?.trim() ?? null,
                masterPhrase: selectValue('#masterPhraseCycles'),
                tempo: document.querySelector('#tempoSlider')?.value ?? null,
                masterVolume: selectValue('#masterVolumeSlider')
            },
            voiceCounts: {
                master: document.querySelectorAll('#masterGrid .voice-row').length,
                A: document.querySelectorAll('#groupingLanesContainer .grouping-lane-row:nth-child(1) .sequencer-container > .voice-row[data-voice-index]').length,
                B: document.querySelectorAll('#groupingLanesContainer .grouping-lane-row:nth-child(2) .sequencer-container > .voice-row[data-voice-index]').length
            },
            active: {
                master1: activeIndexesFor('#masterGrid .voice-row:nth-child(1) .step-btn.active'),
                master2: activeIndexesFor('#masterGrid .voice-row:nth-child(2) .step-btn.active'),
                A1: activeIndexesFor(gl(1, 1, '.step-btn.active')),
                A2: activeIndexesFor(gl(1, 2, '.step-btn.active')),
                B1: activeIndexesFor(gl(2, 1, '.step-btn.active')),
                B2: activeIndexesFor(gl(2, 2, '.step-btn.active'))
            },
            grouping: groupingRows.map(row => {
                const slicedCell = row.querySelector('.sequencer-container > .voice-row[data-voice-index="0"] .step-btn.has-slices');
                const slices = slicedCell ? Array.from(slicedCell.querySelectorAll('.step-slice')) : [];
                return {
                    g: row.querySelector('.grouping-count-select')?.value ?? null,
                    c: row.querySelector('.grouping-cycles-select')?.value ?? null,
                    voices: row.querySelectorAll('.sequencer-container > .voice-row[data-voice-index]').length,
                    offset: slices.length ? slices.findIndex(s => s.classList.contains('start')) : null,
                    active: Array.from(row.querySelectorAll('.sequencer-container > .voice-row[data-voice-index="0"] .step-btn.active')).map(b => Array.from(b.parentElement.children).indexOf(b))
                };
            }),
            mixer: {
                masterVolInLane: !!document.querySelector('#volDriver'),
                masterClickSound: selectValue('#soundDriver'),
                masterClickMute: muteText('#muteDriver'),
                BWheelSolo: document.querySelector('#soloBWheel')?.classList.contains('soloed') ?? false,
                masterVoice1Sound: selectValue('#sound_master_0'),
                masterVoice2Sound: selectValue('#sound_master_1'),
                AVoice1Sound: selectValue(gl(1, 1, '.voice-instrument-select')),
                BVoice1Sound: selectValue(gl(2, 1, '.voice-instrument-select'))
            },
            voiceLabels: {
                master1: selectText('#masterGrid .voice-row:nth-child(1) .voice-instrument-select'),
                master2: selectText('#masterGrid .voice-row:nth-child(2) .voice-instrument-select'),
                A1: selectText(gl(1, 1, '.voice-instrument-select')),
                A2: selectText(gl(1, 2, '.voice-instrument-select')),
                B1: selectText(gl(2, 1, '.voice-instrument-select')),
                B2: selectText(gl(2, 2, '.voice-instrument-select'))
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

        assert(same(initial.active.master1, [0]), 'Master voice 1 should start on pulse 1.', initial.active.master1);
        assert(same(initial.active.A1, [0]), 'Grouping lane 1 voice 1 should start on step 1.', initial.active.A1);
        assert(same(initial.active.B1, [0]), 'Grouping lane 2 voice 1 should start on step 1.', initial.active.B1);
        assert(initial.grouping.length === 2 && initial.grouping[0].g === '6' && initial.grouping[1].g === '4',
            'Rhythm Tracks should default to two grouping lanes for the chosen polyrhythm (6 and 4).', initial.grouping);
        assert(initial.mixer.masterVolInLane, 'Master wheel volume fader should be colocated in the Master lane toolbar.', initial.mixer);
        assert(initial.voiceLabels.master1 === 'Bass Drum (Kick)' && initial.voiceLabels.A1 === 'Woodblock Clack' && initial.voiceLabels.B1 === 'Woodblock Clack', 'Voice rows should display their default mixer instruments.', initial.voiceLabels);
        assert(initial.helpLeads.length === 5, 'Help modal should expose five bold lead sentences.', initial.helpLeads);
        assert(await page.locator('#resetBtn').textContent() === 'Reset Mixer', 'Reset button should clearly describe full mixer reset.');
        const bataOptions = await page.locator('#soundDriver option').evaluateAll(options => options
            .map(option => ({ value: option.value, label: option.textContent.trim() }))
            .filter(option => option.value.startsWith('bata_')));
        assert(same(bataOptions, [
            { value: 'bata_low', label: 'Batá Drum (Low)' },
            { value: 'bata_middle', label: 'Batá Drum (Middle)' },
            { value: 'bata_high', label: 'Batá Drum (High)' },
            { value: 'bata_low_press', label: 'Batá Press (Low)' },
            { value: 'bata_middle_press', label: 'Batá Press (Middle)' },
            { value: 'bata_high_slap', label: 'Batá Slap (High)' },
            { value: 'bata_low_slap', label: 'Batá Slap (Low)' },
            { value: 'bata_middle_slap', label: 'Batá Slap (Middle)' }
        ]), 'Mixer menus should expose all Batá sounds.', bataOptions);
        const congaOptions = await page.locator('#soundDriver option').evaluateAll(options => options
            .map(option => ({ value: option.value, label: option.textContent.trim() }))
            .filter(option => option.value.startsWith('conga_')));
        assert(same(congaOptions, [
            { value: 'conga_high', label: 'Conga (High)' },
            { value: 'conga_low', label: 'Conga (Low)' },
            { value: 'conga_middle', label: 'Conga (Middle)' },
            { value: 'conga_high_bass', label: 'Conga Bass (High)' },
            { value: 'conga_low_bass', label: 'Conga Bass (Low)' },
            { value: 'conga_middle_bass', label: 'Conga Bass (Middle)' },
            { value: 'conga_high_press', label: 'Conga Press (High)' },
            { value: 'conga_low_press', label: 'Conga Press (Low)' },
            { value: 'conga_middle_press', label: 'Conga Press (Middle)' },
            { value: 'conga_slap', label: 'Conga Slap' },
            { value: 'conga_high_slap', label: 'Conga Slap (High)' },
            { value: 'conga_low_slap', label: 'Conga Slap (Low)' },
            { value: 'conga_middle_slap', label: 'Conga Slap (Middle)' }
        ]), 'Mixer menus should expose the conga open tones, press strokes, and slaps.', congaOptions);
        const expandedPercussionOptions = await page.locator('#soundDriver option').evaluateAll(options => options
            .map(option => ({ value: option.value, label: option.textContent.trim() }))
            .filter(option => ['cabasa_shekere', 'gankogui_low', 'gankogui_high', 'guiro', 'talking_drum', 'temple_block', 'triangle', 'udu'].includes(option.value)));
        assert(same(expandedPercussionOptions, [
            { value: 'cabasa_shekere', label: 'Cabasa / Shekere' },
            { value: 'gankogui_low', label: 'Gankogui Bell (Low)' },
            { value: 'gankogui_high', label: 'Gankogui Bell (High)' },
            { value: 'guiro', label: 'Guiro Scraper' },
            { value: 'talking_drum', label: 'Talking Drum' },
            { value: 'temple_block', label: 'Temple Block' },
            { value: 'triangle', label: 'Triangle' },
            { value: 'udu', label: 'Udu Clay Pot' }
        ]), 'Mixer menus should expose the expanded percussion palette.', expandedPercussionOptions);

        // --- Higher meter values rebuild correctly ---
        const groupingFrameSnapshot = () => page.evaluate(() => ({
            meterA: document.querySelector('#rhythmA')?.value ?? null,
            meterB: document.querySelector('#rhythmB')?.value ?? null,
            masterSteps: document.querySelectorAll('#masterGrid .voice-row:nth-child(1) .step-btn').length,
            pulseA: document.querySelectorAll('#meterAWheelGrid .step-btn').length,
            pulseB: document.querySelectorAll('#meterBWheelGrid .step-btn').length,
            groupingValues: Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-count-select')).map(s => s.value),
            groupingBoxes: Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-lane-row')).map(r => r.querySelectorAll('.sequencer-container > .voice-row:nth-child(1) .step-btn').length)
        }));

        await setSelect('#rhythmA', 12);
        await setSelect('#rhythmB', 18);
        const twelveAgainstEighteen = await groupingFrameSnapshot();
        assert(same(twelveAgainstEighteen, {
            meterA: '12', meterB: '18', masterSteps: 36, pulseA: 36, pulseB: 36,
            groupingValues: ['12', '18'], groupingBoxes: [12, 18]
        }), '12 against 18 should be accepted and show 12- and 18-group lanes.', twelveAgainstEighteen);

        await setSelect('#rhythmA', 17);
        await setSelect('#rhythmB', 18);
        const seventeenAgainstEighteen = await groupingFrameSnapshot();
        assert(same(seventeenAgainstEighteen, {
            meterA: '17', meterB: '18', masterSteps: 306, pulseA: 306, pulseB: 306,
            groupingValues: ['17', '18'], groupingBoxes: [17, 18]
        }), 'Higher 18-based meter pairs should also rebuild beyond the old 240-step limit.', seventeenAgainstEighteen);

        // --- 24 against 18 (the 72-pulse frame) ---
        await setSelect('#rhythmA', 24);
        await setSelect('#rhythmB', 18);
        const twentyFourAgainstEighteen = await groupingFrameSnapshot();
        assert(same(twentyFourAgainstEighteen, {
            meterA: '24', meterB: '18', masterSteps: 72, pulseA: 72, pulseB: 72,
            groupingValues: ['24', '18'], groupingBoxes: [24, 18]
        }), '24 against 18 should build the 72-pulse frame with 24- and 18-group lanes.', twentyFourAgainstEighteen);

        // The share/restore clamp must accept 24 rather than silently downgrading it.
        await page.evaluate(() => { globalThis.CompressionStream = undefined; });
        await page.locator('#shareBtn').click();
        await page.waitForFunction(() => globalThis.__lastCopiedShareUrl && globalThis.__lastCopiedShareUrl.includes('?s='));
        const twentyFourShareUrl = await page.evaluate(() => globalThis.__lastCopiedShareUrl);
        await page.goto(twentyFourShareUrl, { waitUntil: 'networkidle' });
        await waitForApp();
        const restoredMeters = await page.evaluate(() => ({ A: document.querySelector('#rhythmA')?.value ?? null, B: document.querySelector('#rhythmB')?.value ?? null }));
        assert(same(restoredMeters, { A: '24', B: '18' }), 'A shared 24-against-18 rhythm should restore as 24 against 18.', restoredMeters);

        // Grouping selectors are per-lane (changing one must not touch the others)
        // and include a single-group option.
        const groupingPerLane = await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-count-select'));
            const options = Array.from(selects[0].options).map(o => o.value);
            selects[0].value = '12';
            selects[0].dispatchEvent(new Event('change', { bubbles: true }));
            const after = Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-count-select')).map(s => s.value);
            return { options, after };
        });
        assert(groupingPerLane.options.includes('1'), 'Grouping dropdown should offer a single group (1).', groupingPerLane.options);
        assert(same(groupingPerLane.after, ['12', '18']), 'Changing one grouping lane should not affect the others.', groupingPerLane);

        await page.locator('#resetBtn').click();
        await page.waitForFunction(() => document.querySelector('#rhythmA')?.value === '6' && document.querySelector('#rhythmB')?.value === '4');
        assert(
            await page.locator('#beatSchemeSummary').textContent() === '— 6 against 4',
            'Reset Mixer should restore the beat-scheme summary to the starting meter ratio.'
        );

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
            const groupingIdx = (lane) => currentBtnIndex(`#groupingLanesContainer .grouping-lane-row:nth-child(${lane}) .sequencer-container > .voice-row:nth-child(1)`);
            return {
                masterCt: currentClassCount('#masterGrid'),
                groupingCt: currentClassCount('#groupingLanesContainer'),
                AwheelIdx: currentBtnIndex('#meterAWheelGrid'),
                BwheelIdx: currentBtnIndex('#meterBWheelGrid'),
                masterIdx: currentBtnIndex('#masterGrid'),
                grouping0Idx: groupingIdx(1),
                grouping1Idx: groupingIdx(2)
            };
        });

        const hl1 = await snapshotHighlight();

        assert(hl1.masterCt >= 1, 'At least one master step button should be highlighted');
        assert(hl1.groupingCt >= 2, 'Grouping lanes should highlight a current step.', hl1);
        assert(hl1.AwheelIdx >= 0, 'A-wheel step button should be highlighted', hl1);
        assert(hl1.BwheelIdx >= 0, 'B-wheel step button should be highlighted', hl1);
        assert(hl1.grouping0Idx >= 0 && hl1.grouping1Idx >= 0, 'Every grouping lane should highlight its current group.', hl1);

        // Wait more and verify the highlighted step has advanced
        await page.waitForTimeout(2000);
        const hl2 = await snapshotHighlight();

        assert(hl2.masterIdx !== hl1.masterIdx,
            'Master step highlight should advance over time',
            { before: hl1, after: hl2 });
        assert(hl2.grouping0Idx !== hl1.grouping0Idx,
            'Grouping lane highlight should advance over time',
            { before: hl1, after: hl2 });

        // --- Voice removal and re-add preserves mixer dropdown population ---
        // Add voices, remove middle one, re-add — all dropdowns must have options
        await page.locator('#addMasterVoiceBtn').click();
        await page.locator('#addMasterVoiceBtn').click();
        await page.waitForTimeout(300);
        // Remove the middle voice (index 1 of 3) via its sequencer row remove button
        await page.locator('#masterGrid .voice-row:nth-child(2) .remove-voice-btn').click();
        await page.waitForTimeout(300);
        // Re-add a voice
        await page.locator('#addMasterVoiceBtn').click();
        await page.waitForTimeout(300);

        const masterVoiceSelects = await page.locator('#masterGrid .voice-row .voice-instrument-select').evaluateAll(selects =>
            selects.map(s => ({ id: s.id, options: s.options.length }))
        );
        assert(masterVoiceSelects.every(s => s.options > 0),
            'All master voice instrument selects should have options after remove/re-add',
            masterVoiceSelects);
        // No duplicate volume-fader IDs across master voice rows
        const volIds = await page.locator('#masterGrid .voice-row input.volume-fader').evaluateAll(els =>
            els.map(e => e.id)
        );
        const uniqueVol = new Set(volIds);
        assert(volIds.length === uniqueVol.size,
            'Master voice volume-fader IDs must be unique after remove/re-add',
            { ids: volIds, duplicates: volIds.filter((id, i) => volIds.indexOf(id) !== i) });

        // Reset voices back to 1 by reloading — removes clutter for subsequent tests
        await page.locator('#resetBtn').click();
        await page.waitForTimeout(300);

        // --- Solo button toggling on fixed and voice channels ---
        async function testSolo(id) {
            const btn = page.locator(`#${id}`);
            const textBefore = await btn.textContent();
            assert(textBefore === 'Solo', `Solo button ${id} should start as 'Solo'`, textBefore);
            await btn.click();
            await page.waitForTimeout(100);
            const textAfter = await btn.textContent();
            assert(textAfter === 'Soloed', `Solo button ${id} should toggle to 'Soloed'`, textAfter);
            const hasClass = await btn.evaluate(el => el.classList.contains('soloed'));
            assert(hasClass, `${id} should have 'soloed' class when active`);
            await btn.click();
            await page.waitForTimeout(100);
            const textFinal = await btn.textContent();
            assert(textFinal === 'Solo', `Solo button ${id} should toggle back to 'Solo'`, textFinal);
        }

        // Voices now default to collapsed (per the rail-controls UI change). Expand
        // every collapsed voice rail so per-voice controls (Solo/Mute/Clear/Nudge)
        // are reachable in this regression run.
        async function expandAllRails() {
            await page.locator('.rail-toggle-btn[aria-expanded="false"]').evaluateAll(els => els.forEach(e => e.click()));
            await page.waitForTimeout(80);
        }

        // The Master lane intentionally has no lane-level Solo button (its
        // per-voice Solo already covers it); assert it's absent so it isn't
        // accidentally re-added.
        const masterSoloCount = await page.locator('#soloDriver').count();
        assert(masterSoloCount === 1, 'Master beat should have a colocated Solo button in the beat-scheme controls', `found ${masterSoloCount}`);
        // Pulse-section rails now default to collapsed; expand them so the colocated
        // Solo/Mute controls are reachable.
        await expandAllRails();
        await testSolo('soloDriver');
        await testSolo('soloAWheel');
        await testSolo('soloBWheel');
        // Voice channels: add one, test solo, remove
        await page.locator('#addMasterVoiceBtn').click();
        await page.waitForTimeout(300);
        await expandAllRails();
        await testSolo('solo_master_1');
        await page.locator('#resetBtn').click();
        await page.waitForTimeout(300);

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
        const glGrid = (lane) => `#groupingLanesContainer .grouping-lane-row:nth-child(${lane}) .sequencer-container`;
        const glRow = (lane) => `#groupingLanesContainer .grouping-lane-row:nth-child(${lane})`;

        const applyGroupingEdits = async () => {
            await setSelect('#rhythmA', 5);
            await setSelect('#rhythmB', 7);
            await setSelect(`${glRow(1)} .grouping-cycles-select`, 2);
            await setRange('#tempoSlider', 118);
            await setRange('#masterVolumeSlider', 72);
            await setSelect('#soundDriver', 'cowbell');
            await setSelect('#sound_master_0', 'snare');
            await page.locator('#addMasterVoiceBtn').click();
            // Add a third grouping voice lane via the single bottom "+ Voice"
            // button. Each lane keeps its own grouping.
            await page.locator('#groupingLanesContainer .add-voice-btn').click();
            await setSelect(`${glRow(3)} .grouping-count-select`, 5);
            await setSelect('#sound_master_1', 'claves');
            await setSelect('#sound_grouping_0_0', 'woodblock');
            await setSelect('#sound_grouping_2_0', 'cowbell');
            // Expand rails so the colocated Solo button is reachable, then solo
            // the second grouping lane.
            await expandAllRails();
            await page.locator('#solo_grouping_1_0').click();
            // Shift the first grouping lane's start by one pulse (frame 5×7 → 7 slices).
            await page.locator(`${glRow(1)} .grouping-offset-next`).click();

            await clickStep('#masterGrid', 1, 3);
            await clickStep('#masterGrid', 1, 8);
            await clickStep('#masterGrid', 2, 2);
            await clickStep('#masterGrid', 2, 6);
            await clickStep(glGrid(1), 1, 4);
            await clickStep(glGrid(1), 1, 2);
            await clickStep(glGrid(2), 1, 5);
            await clickStep(glGrid(2), 1, 2);
            await clickStep(glGrid(3), 1, 3);
            await clickStep(glGrid(3), 1, 4);

            await expandAllRails();
            await page.locator('#masterGrid .voice-row:nth-child(2) .voice-nudge-btn[title="Shift Voice 2 right"]').click();
            await page.locator(`${glRow(1)} .sequencer-container > .voice-row:nth-child(1) .voice-nudge-btn[title="Shift Voice 1 right"]`).click();
            await page.locator(`${glRow(2)} .sequencer-container > .voice-row:nth-child(1) .voice-nudge-btn[title="Shift Voice 1 left"]`).click();
        };

        await applyGroupingEdits();

        const liveInstrumentLabels = await snapshot();
        assert(liveInstrumentLabels.voiceLabels.master1 === 'Snare Drum' && liveInstrumentLabels.voiceLabels.master2 === 'Claves' && liveInstrumentLabels.voiceLabels.A1 === 'Woodblock Clack', 'Voice row instrument labels should update when mixer selections change.', liveInstrumentLabels.voiceLabels);

        const expectedCurrent = await snapshot();

        await page.locator('#resetBtn').click();
        await page.waitForFunction(() => document.querySelectorAll('#masterGrid .voice-row').length === 1);
        assert(same(await snapshot(), initial), 'Reset Mixer should restore the startup state after meter, voice, pattern, nudge, and mixer edits.', { expected: initial, actual: await snapshot() });

        await applyGroupingEdits();

        const testName = `Regression Save ${Date.now()}`;

        await page.locator('#saveRhythmBtn').click();
        await page.locator('#saveRhythmNameInput').fill(testName);
        await page.locator('#confirmSaveRhythmBtn').click();
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('alans-polyrhythm-mixer-saved-rhythms') || '[]').some(item => String(item.name || '').startsWith('Regression Save ')));

        const savedPayload = await page.evaluate(({ key, name }) => JSON.parse(localStorage.getItem(key)).find(item => item.name === name)?.payload, { key: SAVED_RHYTHMS_KEY, name: testName });
        assert(savedPayload?.v === 5, 'Saved rhythm should use the current payload version.', savedPayload);
        assert(savedPayload?.m?.masterVolume === 72, 'Saved rhythm should include Master Volume.', savedPayload?.m);
        assert(savedPayload?.p?.gl?.[1]?.v?.[0]?.o === 1, 'Saved rhythm should include the second grouping lane\'s solo state.', savedPayload?.p?.gl?.[1]);
        assert(savedPayload?.p?.gl?.[0]?.ph === 1, 'Saved rhythm should include the first grouping lane\'s pulse offset.', savedPayload?.p?.gl?.[0]);
        assert(!!(savedPayload?.p?.m?.some(v => v.n) || savedPayload?.p?.gl?.some(l => l.v?.some(v => v.n))), 'Saved rhythm should include nudge offsets.', savedPayload?.p);

        await page.goto(`${BASE_URL}/?cache-bust=save-fresh-load-${Date.now()}`, { waitUntil: 'networkidle' });
        await waitForApp();
        await page.locator('#loadRhythmBtn').click();
        await page.locator('.saved-rhythm-item', { hasText: testName }).locator('.saved-rhythm-load-btn').click();
        await page.waitForFunction(() => document.querySelector('#savedRhythmsModal')?.classList.contains('hidden'));
        assert(same(await snapshot(), expectedCurrent), 'Fresh-page saved rhythm load should restore the current state.', { expected: expectedCurrent, actual: await snapshot() });

        await page.evaluate(() => { globalThis.CompressionStream = undefined; });
        await page.locator('#shareBtn').click();
        await page.waitForFunction(() => globalThis.__lastCopiedShareUrl && globalThis.__lastCopiedShareUrl.includes('?s='));
        const currentShareUrl = await page.evaluate(() => globalThis.__lastCopiedShareUrl);
        assert(
            !new URL(currentShareUrl).searchParams.get('s').startsWith('z:'),
            'Share links should fall back to uncompressed encoding without Compression Streams.'
        );
        await page.goto(currentShareUrl, { waitUntil: 'networkidle' });
        await waitForApp();
        assert(same(await snapshot(), expectedCurrent), 'Current share URL should restore the current state.', { expected: expectedCurrent, actual: await snapshot() });

        // Editing a later phrase cycle must update that cycle's absolute step,
        // not the same displayed step in cycle one.
        const groupingCycleRow = page.locator(glRow(1));
        const groupingNextCycle = groupingCycleRow.locator('.cycle-nav-btn[title="Next cycle"]');
        const groupingPreviousCycle = groupingCycleRow.locator('.cycle-nav-btn[title="Previous cycle"]');
        await groupingNextCycle.click();
        await clickStep(glGrid(1), 1, 4);
        await groupingPreviousCycle.click();
        await groupingNextCycle.click();
        assert(
            await page.locator(`${glGrid(1)} > .voice-row:nth-child(1) .step-btn`).nth(4).getAttribute('aria-pressed') === 'true',
            'A step selected in a later phrase cycle should remain selected after navigating away and back.'
        );

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

        // --- Master phrase cycle count round-trips through share (regression:
        //     the restore clamp once capped masterPhrase at 4, but the selector
        //     offers up to 8 cycles) ---
        await setSelect('#masterPhraseCycles', 7);
        const masterBeatBandsAt7 = await page.evaluate(() => document.querySelectorAll('.master-beat-grid .mb-quarter').length);
        assert(masterBeatBandsAt7 === 4, 'The Master Beat should always render exactly 4 quarter beats, regardless of the master phrase cycle count.', { masterBeatBandsAt7 });

        await page.evaluate(() => { globalThis.CompressionStream = undefined; });
        await page.locator('#shareBtn').click();
        await page.waitForFunction(() => globalThis.__lastCopiedShareUrl && globalThis.__lastCopiedShareUrl.includes('?s='));
        const sevenCycleShareUrl = await page.evaluate(() => globalThis.__lastCopiedShareUrl);
        await page.goto(sevenCycleShareUrl, { waitUntil: 'networkidle' });
        await waitForApp();
        assert(
            (await snapshot()).meters.masterPhrase === '7',
            'A shared rhythm with 7 master phrase cycles should rehydrate with 7 cycles, not clamp to a lower count.',
            await snapshot()
        );

        // --- Pinned phrase lanes loop their playhead highlight continuously ---
        // Regression: the pinned highlight only lit while the master playhead
        // happened to sweep through the pinned cycle, going dark for the rest
        // of the phrase. It must wrap the global step index modulo the cycle
        // length so it loops the pinned cycle like the audio gate does.
        await page.locator('#audioBtn').click();
        await setSelect(`${glRow(1)} .grouping-cycles-select`, 2);
        const groupingPinRow = page.locator(glRow(1));
        await groupingPinRow.locator('.cycle-nav-btn[title="Next cycle"]').click(); // pins + shows cycle 2
        await page.waitForTimeout(400);
        const pinnedSamples = [];
        for (let i = 0; i < 8; i++) {
            pinnedSamples.push(await page.evaluate((sel) => {
                const btns = document.querySelectorAll(sel);
                return Array.from(btns).findIndex(b => b.classList.contains('current'));
            }, `${glGrid(1)} > .voice-row:nth-child(1) .step-btn`));
            await page.waitForTimeout(450);
        }
        assert(pinnedSamples.every(idx => idx >= 0), 'A pinned phrase lane should keep its playhead highlight lit at every sample, not only while the master playhead sweeps the pinned cycle.', pinnedSamples);
        assert(new Set(pinnedSamples).size > 1, 'A pinned phrase lane highlight should advance through the pinned cycle over time.', pinnedSamples);

        // --- Main-thread stall recovery ---
        // A long stall (GC, layout) makes the audio-clock-derived angle jump.
        // The visual catch-up must bound itself and recover on the next frame
        // rather than replaying hundreds of steps or wedging.
        await page.evaluate(() => { const start = Date.now(); while (Date.now() - start < 300) {} });
        await page.waitForTimeout(600);
        const recoveredHighlight = await page.evaluate(() => {
            const btns = document.querySelectorAll('#masterGrid .voice-row:nth-child(1) .step-btn');
            return Array.from(btns).some(b => b.classList.contains('current'));
        });
        assert(recoveredHighlight, 'After a main-thread stall, the step highlight should recover on the next frame.');

        // --- Visualization mode switcher ---
        // --- Visualization mode switcher (five views) ---
        const vizModes = ['gears', 'rings', 'align', 'voice', 'shapes'];
        for (const mode of vizModes) {
            await page.locator(`#vizMode${mode[0].toUpperCase()}${mode.slice(1)}`).click();
            for (const m of vizModes) {
                const expected = m === mode ? 'true' : 'false';
                const actual = await page.locator(`#vizMode${m[0].toUpperCase()}${m.slice(1)}`).getAttribute('aria-pressed');
                assert(actual === expected, `Visualization mode "${mode}" should be active and "${m}" inactive.`, { mode, m, actual });
            }
        }
        await page.locator('#vizModeGears').click();
        assert(
            await page.locator('#vizModeGears').getAttribute('aria-pressed') === 'true',
            'Switching back to gears should restore the default view.'
        );

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