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
        await page.waitForSelector('#sound_master_0', { state: 'attached', timeout: 10000 });
        if (await page.locator('#stickyBarToggle').getAttribute('aria-expanded') === 'false') {
            await page.locator('#stickyBarToggle').click();
        }
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
                beatScheme: document.querySelector('.polyrhythm-description-title')?.textContent?.trim() ?? null,
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
            help: {
                title: document.querySelector('#helpModalTitle')?.textContent.trim(),
                quickStart: document.querySelector('#helpModal .help-quick-start')?.innerText.trim(),
                detailsOpen: document.querySelector('#helpModal .help-details')?.open,
                detailsSummary: document.querySelector('#helpModal .help-details > summary')?.textContent.trim(),
                details: document.querySelector('#helpModal .help-details-content')?.textContent.trim().replace(/\s+/g, ' ')
            },
            polyrhythmViewOpen: document.querySelector('#polyrhythmView')?.open
        };
    });

    const setSelect = async (selector, value) => {
        if (selector === '#masterPhraseCycles' && !(await page.locator('#masterPatternControls').evaluate(el => el.open))) {
            await page.locator('#masterPatternControls > summary').click();
        }
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
        assert(same(initial.active.A1, [0, 1, 2, 3, 4, 5]), 'Meter A grouping lane voice 1 should start with the canonical 6-pulse (every onset).', initial.active.A1);
        assert(same(initial.active.B1, [0, 1, 2, 3]), 'Meter B grouping lane voice 1 should start with the canonical 4-pulse (every onset).', initial.active.B1);
        assert(initial.grouping.length === 2 && initial.grouping[0].g === '6' && initial.grouping[1].g === '4',
            'Rhythm Tracks should default to two grouping lanes for the chosen polyrhythm (6 and 4).', initial.grouping);
        assert(initial.mixer.masterVolInLane, 'Master wheel volume fader should be colocated in the Master lane toolbar.', initial.mixer);
        assert(await page.locator('#meterAWheelGrid').count() === 0 && await page.locator('#meterBWheelGrid').count() === 0,
            'The Meter A/B wheel lanes should be gone — the pulse lives in the grouping lanes.');
        const initialBeatGeometry = await page.evaluate(() => {
            const rect = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
            };
            return {
                beat: rect('.master-beat-grid .voice-steps'),
                phrase: rect('#masterGrid .voice-row .voice-steps'),
                subtitle: document.querySelector('#masterBeatControls .master-beat-sub')?.textContent?.trim() ?? null
            };
        });
        assert(
            same(initialBeatGeometry.beat, initialBeatGeometry.phrase),
            'The Master Beat pulse track should share the exact same horizontal span as the Master phrase track.',
            initialBeatGeometry
        );
        assert(
            initialBeatGeometry.subtitle === '4/4 reference · 4 equal beats of 3 pulses each',
            'For 6 against 4, the Master Beat subtitle should state the integer pulse spacing per beat.',
            initialBeatGeometry.subtitle
        );
        assert(initial.voiceLabels.master1 === 'Handclap' && initial.voiceLabels.A1 === 'Percussion Shaker' && initial.voiceLabels.B1 === 'Percussion Shaker', 'Voice rows should display their default mixer instruments.', initial.voiceLabels);
        assert(initial.help.title === 'Make two rhythms meet', 'Help modal should lead with the mixer mental model.', initial.help);
        assert(initial.help.quickStart.includes('Enable Audio') && initial.help.quickStart.includes('Pause') && initial.help.quickStart.includes('Play'),
            'Quick start should distinguish enabling audio from controlling playback.', initial.help.quickStart);
        assert(initial.help.quickStart.includes('Polyrhythm Visualization') && initial.help.quickStart.includes('gears, rings, orbit, clocks'),
            'Quick start should explain how to open and explore the visualizations.', initial.help.quickStart);
        assert(initial.help.detailsOpen === false && initial.help.detailsSummary === 'More about the mixer',
            'Detailed mixer help should be available in a collapsed section.', initial.help);
        assert(initial.help.details.includes('Grouping') && initial.help.details.includes('Phrase Length') && initial.help.details.includes('Save, share, and explore'),
            'Expanded help should explain the advanced mixer features.', initial.help.details);
        assert(initial.polyrhythmViewOpen === false, 'The polyrhythm visualization should start collapsed.', initial.polyrhythmViewOpen);
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
            groupingValues: Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-count-select')).map(s => s.value),
            groupingBoxes: Array.from(document.querySelectorAll('#groupingLanesContainer .grouping-lane-row')).map(r => r.querySelectorAll('.sequencer-container > .voice-row:nth-child(1) .step-btn').length)
        }));

        await setSelect('#rhythmA', 12);
        await setSelect('#rhythmB', 18);
        const twelveAgainstEighteen = await groupingFrameSnapshot();
        assert(same(twelveAgainstEighteen, {
            meterA: '12', meterB: '18', masterSteps: 36,
            groupingValues: ['12', '18'], groupingBoxes: [12, 18]
        }), '12 against 18 should be accepted and show 12- and 18-group lanes.', twelveAgainstEighteen);

        await setSelect('#rhythmA', 17);
        await setSelect('#rhythmB', 18);
        const seventeenAgainstEighteen = await groupingFrameSnapshot();
        assert(same(seventeenAgainstEighteen, {
            meterA: '17', meterB: '18', masterSteps: 306,
            groupingValues: ['17', '18'], groupingBoxes: [17, 18]
        }), 'Higher 18-based meter pairs should also rebuild beyond the old 240-step limit.', seventeenAgainstEighteen);

        // --- 24 against 18 (the 72-pulse frame) ---
        await setSelect('#rhythmA', 24);
        await setSelect('#rhythmB', 18);
        const twentyFourAgainstEighteen = await groupingFrameSnapshot();
        assert(same(twentyFourAgainstEighteen, {
            meterA: '24', meterB: '18', masterSteps: 72,
            groupingValues: ['24', '18'], groupingBoxes: [24, 18]
        }), '24 against 18 should build the 72-pulse frame with 24- and 18-group lanes.', twentyFourAgainstEighteen);

        await setSelect('#rhythmA', 3);
        await setSelect('#rhythmB', 5);
        const fractionalBeatSubtitle = await page.locator('#masterBeatControls .master-beat-sub').textContent();
        assert(
            fractionalBeatSubtitle?.trim() === '4/4 reference · 4 equal beats across 15 pulses (3.75 pulses per beat)',
            'For 3 against 5, the Master Beat subtitle should explain the fractional beat spacing over the LCM pulse grid.',
            fractionalBeatSubtitle
        );

        await setSelect('#rhythmA', 24);
        await setSelect('#rhythmB', 18);

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

        // --- Grouping lifecycle: any lane can be deleted; the meter re-asserts it ---
        // Delete both linked lanes (the grouping list can go empty), then pick a
        // new meter: the linked A/B lanes must reappear, pre-tapped with the pulse.
        // Lane remove controls now live in the collapsible rail; expand before each
        // remove because rebuilding a lane re-collapses its rail.
        const expandGroupingRails = async () => {
            await page.locator('#groupingLanesContainer .rail-toggle-btn[aria-expanded="false"]').evaluateAll(els => els.forEach(e => e.click()));
            await page.waitForTimeout(80);
        };
        await expandGroupingRails();
        await page.locator('#groupingLanesContainer .grouping-lane-row:nth-child(2) .remove-voice-btn').click();
        await expandGroupingRails();
        await page.locator('#groupingLanesContainer .grouping-lane-row:nth-child(1) .remove-voice-btn').click();
        const emptyState = await page.evaluate(() => ({
            lanes: document.querySelectorAll('#groupingLanesContainer .grouping-lane-row').length,
            hint: document.querySelector('.grouping-empty-hint')?.textContent ?? null
        }));
        assert(emptyState.lanes === 0 && !!emptyState.hint, 'Deleting both groupings should show the empty-state hint.', emptyState);
        await setSelect('#rhythmA', 5);
        const reasserted = await groupingFrameSnapshot();
        assert(same(reasserted.groupingValues, ['5', '18']), 'Picking a new meter should recreate the linked A/B grouping lanes.', reasserted);
        const reassertedActive = await snapshot();
        assert(same(reassertedActive.active.A1, [0, 1, 2, 3, 4]), 'The recreated Meter A lane should be pre-tapped with the 5-pulse.', reassertedActive.active);
        // + Voice should add the smallest unused grouping (5 and 18 taken → divisors of 90: 1,2,3,6,9...), not a duplicate.
        await page.locator('#groupingLanesContainer .add-voice-btn').click();
        const addedValues = (await groupingFrameSnapshot()).groupingValues;
        assert(addedValues.length === 3 && addedValues[2] === '1', 'Adding a grouping should pick the smallest unused grouping.', addedValues);

        // Restore the 12×18 frame the following reset assertion expects.
        await setSelect('#rhythmA', 12);

        await page.locator('#resetBtn').click();
        await page.waitForFunction(() => document.querySelector('#rhythmA')?.value === '6' && document.querySelector('#rhythmB')?.value === '4');
        assert(
            await page.locator('.polyrhythm-description-title').textContent() === '6 against 4 Polyrhythm',
            'Reset Mixer should restore the meter explanation to the starting ratio.'
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
                masterIdx: currentBtnIndex('#masterGrid'),
                grouping0Idx: groupingIdx(1),
                grouping1Idx: groupingIdx(2)
            };
        });

        const hl1 = await snapshotHighlight();

        assert(hl1.masterCt >= 1, 'At least one master step button should be highlighted');
        assert(hl1.groupingCt >= 2, 'Grouping lanes should highlight a current step.', hl1);
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
        await expandAllRails();
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
        // Voice solo/mute controls now render as compact header chips (S/M)
        // while the fixed driver control keeps its full words; accept both.
        const isSoloOff = (t) => t === 'Solo' || t === 'S';
        const isSoloOn = (t) => t === 'Soloed' || t === 'S';
        async function testSolo(id) {
            const btn = page.locator(`#${id}`);
            const textBefore = await btn.textContent();
            assert(isSoloOff(textBefore), `Solo button ${id} should start off`, textBefore);
            await btn.click();
            await page.waitForTimeout(100);
            const textAfter = await btn.textContent();
            assert(isSoloOn(textAfter), `Solo button ${id} should toggle to on`, textAfter);
            const hasClass = await btn.evaluate(el => el.classList.contains('soloed'));
            assert(hasClass, `${id} should have 'soloed' class when active`);
            await btn.click();
            await page.waitForTimeout(100);
            const textFinal = await btn.textContent();
            assert(isSoloOff(textFinal), `Solo button ${id} should toggle back off`, textFinal);
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
        // Pulse-section rail now defaults to collapsed; expand it so the colocated
        // Solo/Mute controls are reachable.
        await expandAllRails();
        await testSolo('soloDriver');
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
            // Meter changes rebuild lanes and re-collapse their rails, so expand
            // before touching rail-scoped grouping controls.
            await expandAllRails();
            await setSelect(`${glRow(1)} .grouping-cycles-select`, 2);
            await setRange('#tempoSlider', 118);
            await setRange('#masterVolumeSlider', 72);
            await setSelect('#soundDriver', 'cowbell');
            await setSelect('#sound_master_0', 'snare');
            await page.locator('#addMasterVoiceBtn').click();
            // Add a third grouping voice lane via the single bottom "+ Voice"
            // button. Each lane keeps its own grouping.
            await page.locator('#groupingLanesContainer .add-voice-btn').click();
            await expandAllRails();
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

        await page.locator('#polyrhythmView > summary').click();
        assert(await page.locator('#polyrhythmView').evaluate(el => el.open), 'The visualization should open from its summary control.');
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
        assert(savedPayload?.v === 6, 'Saved rhythm should use the current payload version.', savedPayload);
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
        await expandAllRails();
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
        assert(same(legacySaved.active.master1, [0]), 'Legacy saved payload should migrate the master pattern.', legacySaved.active);
        // The wheel lanes are gone: their patterns fold into the linked grouping
        // lanes' voice 1 — aw [0,1,2] = A onsets 0,1,2 and bw [0..3] = B onsets,
        // merged with the migrated phrase patterns ap [0,2] / bp [0,3].
        assert(same(legacySaved.active.A1, [0, 1, 2]), 'Legacy saved payload should fold the A wheel into grouping lane 1.', legacySaved.active);
        assert(same(legacySaved.active.B1, [0, 1, 2, 3]), 'Legacy saved payload should fold the B wheel into grouping lane 2.', legacySaved.active);

        await page.goto(legacyShareUrl, { waitUntil: 'networkidle' });
        await waitForApp();
        const legacyShared = await snapshot();
        assert(legacyShared.meters.A === '3' && legacyShared.meters.B === '4' && legacyShared.meters.tempo === '96', 'Legacy share URL should migrate meter settings.', legacyShared);
        assert(same(legacyShared.active.master1, [0]) && same(legacyShared.active.A1, [0, 1, 2]) && same(legacyShared.active.B1, [0, 1, 2, 3]), 'Legacy share URL should migrate patterns and fold wheel pulses into the grouping lanes.', legacyShared.active);

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
        await expandAllRails();
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

        // --- Grouping playhead aligns to the underlying pulse cell ---
        // Regression: the playhead column was positioned as a fraction of the
        // container width, so the grid's column gap and (at narrow widths) its
        // horizontal overflow made it drift progressively left of the pulse
        // boxes it marks. It must be measured against the rendered cell.
        const playheadAlign = await page.evaluate((sel) => {
            const grid = document.querySelector(sel);
            const underlay = grid && grid.previousElementSibling;
            const playhead = grid && grid.querySelector('.lane-playhead');
            if (!underlay || !playhead || playhead.style.opacity === '0') return null;
            const pr = playhead.getBoundingClientRect();
            const cells = [...underlay.children].map(c => c.getBoundingClientRect());
            let best = 0;
            cells.forEach((r, i) => { if (Math.abs(r.left - pr.left) < Math.abs(cells[best].left - pr.left)) best = i; });
            return {
                leftErr: Number(Math.abs(cells[best].left - pr.left).toFixed(3)),
                widthErr: Number(Math.abs(cells[best].width - pr.width).toFixed(3)),
            };
        }, `${glRow(1)} .grouping-overlay-grid`);
        assert(
            playheadAlign && playheadAlign.leftErr < 0.5 && playheadAlign.widthErr < 0.5,
            'The grouping-lane playhead should sit exactly on the pulse cell it marks, not drift from column gap or grid overflow.',
            playheadAlign
        );

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
        // --- Visualization mode switcher (nine views) ---
        if (!(await page.locator('#polyrhythmView').evaluate(el => el.open))) {
            await page.locator('#polyrhythmView > summary').click();
        }
        const vizModes = ['gears', 'rings', 'orbit', 'clock', 'phase', 'phase3d', 'align', 'voice', 'shapes'];
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

        // --- Dense meters wrap instead of scrolling horizontally ---
        // 6 against 7 = 42 pulses, wider than the lane at the test viewport.
        // The grids must flow onto extra rows (auto-fit) rather than overflow
        // and scroll, and the grouping pulse underlay must wrap with them.
        await setSelect('#rhythmA', 6);
        await setSelect('#rhythmB', 7);
        await page.waitForTimeout(200);
        const denseWrap = await page.evaluate(() => {
            const rowsOf = (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                const cells = [...el.children].filter(c => !c.classList.contains('lane-playhead'));
                if (!cells.length) return null;
                return {
                    rows: new Set(cells.map(c => c.offsetTop)).size,
                    overflow: el.scrollWidth - el.clientWidth,
                    count: cells.length,
                };
            };
            // Each grouping box must contain exactly its group's worth of pulse
            // substeps — rows break at group boundaries, so no box straddles a
            // wrap and none is left without substeps.
            const groupSubsteps = [...document.querySelectorAll('.grouping-overlay-mode')].map((wrap) => {
                const groupSize = Number(wrap.dataset.groupSize);
                const cells = [...wrap.querySelector('.grouping-underlay-grid').children].map(c => c.getBoundingClientRect());
                const btns = [...wrap.querySelector('.grouping-overlay-grid').children].filter(c => !c.classList.contains('lane-playhead'));
                const counts = btns.map(btn => {
                    const r = btn.getBoundingClientRect();
                    return cells.filter(c => {
                        const cx = c.left + c.width / 2;
                        const cy = c.top + c.height / 2;
                        return cx >= r.left - 0.5 && cx <= r.right + 0.5 && cy >= r.top - 0.5 && cy <= r.bottom + 0.5;
                    }).length;
                });
                return { groupSize, counts };
            });
            return {
                master: rowsOf('#masterGrid .voice-steps'),
                underlay: rowsOf('.grouping-underlay-grid'),
                groupSubsteps,
            };
        });
        assert(
            denseWrap.master && denseWrap.master.rows > 1 && denseWrap.master.overflow <= 1,
            'A dense meter (6 against 7) should wrap the Master step grid onto multiple rows instead of scrolling.',
            denseWrap.master
        );
        assert(
            denseWrap.underlay && denseWrap.underlay.rows > 1 && denseWrap.underlay.overflow <= 1,
            'The grouping pulse underlay should wrap onto multiple rows with the Master grid.',
            denseWrap.underlay
        );
        assert(
            denseWrap.groupSubsteps.length > 0 && denseWrap.groupSubsteps.every(
                (lane) => lane.groupSize > 0 && lane.counts.every((n) => n === lane.groupSize)
            ),
            'Every grouping box should hold exactly its group\'s pulse substeps when the lane wraps.',
            denseWrap.groupSubsteps
        );

        // The sub-playhead must keep sweeping the pulse boxes even when the
        // lane wraps — following its cell onto the next row rather than being
        // hidden behind the per-group highlight.
        const wrappedPlayhead = await page.evaluate(() => {
            const wrap = document.querySelector('.grouping-overlay-mode');
            const over = wrap.querySelector('.grouping-overlay-grid');
            const under = wrap.querySelector('.grouping-underlay-grid');
            const ph = over.querySelector('.lane-playhead');
            if (!ph || ph.style.opacity === '0') return { visible: false };
            const pr = ph.getBoundingClientRect();
            const cells = [...under.children].map(c => c.getBoundingClientRect());
            let best = -1;
            let err = Infinity;
            cells.forEach((r, i) => {
                const e = Math.abs(r.left - pr.left) + Math.abs(r.top - pr.top);
                if (e < err) { err = e; best = i; }
            });
            return {
                visible: true,
                err: Number(err.toFixed(2)),
                wErr: Number(Math.abs(pr.width - cells[best].width).toFixed(2)),
                hErr: Number(Math.abs(pr.height - cells[best].height).toFixed(2)),
            };
        });
        assert(
            wrappedPlayhead.visible && wrappedPlayhead.err < 1 && wrappedPlayhead.wErr < 1 && wrappedPlayhead.hErr < 1,
            'A wrapped grouping lane should keep its sub-playhead visible on the pulse cell it marks.',
            wrappedPlayhead
        );

        for (const viewport of [
            { width: 320, height: 568 },
            { width: 390, height: 844 },
            { width: 667, height: 375 }
        ]) {
            await page.setViewportSize(viewport);
            await page.reload();
            await page.waitForFunction(() => document.querySelector('#playBtn')?.textContent === 'Pause');
            const compact = await page.locator('#stickyBar').evaluate(el => ({
                collapsed: el.classList.contains('collapsed'),
                height: el.getBoundingClientRect().height,
                expanded: document.querySelector('#stickyBarToggle').getAttribute('aria-expanded'),
                controls: [...el.querySelectorAll('.toolbar-transport button')].map(button => {
                    const rect = button.getBoundingClientRect();
                    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
                })
            }));
            assert(compact.collapsed && compact.expanded === 'false' && compact.height <= 108,
                'Small screens should start with a two-row pinned strip no taller than 108px.', { viewport, compact });
            assert(compact.controls.every(rect => rect.left >= 0 && rect.right <= viewport.width && rect.width >= 44 && rect.height >= 44),
                'Playback controls should fit the viewport and retain 44px touch targets.', { viewport, compact });
            assert(same(await page.locator('.toolbar-transport button').evaluateAll(buttons => buttons.map(button => button.id)),
                ['stickyBarToggle', 'audioBtn', 'playBtn', 'stopBtn', 'resetBtn']),
                'Pinned buttons should place Controls first and Reset immediately after Stop.');
            assert(!(await page.locator('#masterPatternControls').evaluate(el => el.open)),
                'Shared Master pattern controls should start collapsed.');
            for (const selector of ['#soundDriver']) {
                assert(await page.locator(selector).isVisible(),
                    'Master Beat should retain the same common controls as voice rows.', { viewport, selector });
            }
            assert(!(await page.locator('#soloDriver').isVisible()) && !(await page.locator('#muteDriver').isVisible()),
                'Beat mix actions should be hidden until its controls open.');
            const beatControlLayout = await page.locator('#masterBeatControls').evaluate(el => {
                const controls = [...el.querySelectorAll('.identity-group select, .head-mix-controls button')]
                    .map(control => control.getBoundingClientRect());
                return controls.every(rect => rect.width >= 44) &&
                    controls.every(rect => rect.height >= 44 && Math.abs(rect.top - controls[0].top) < 1 &&
                        rect.right <= innerWidth);
            });
            assert(beatControlLayout, 'Master Beat common controls should fit one touch-friendly row.', viewport);
            await page.locator('#soundDriver').selectOption('snare');
            await page.locator('#masterBeatControls .rail-toggle-btn').click();
            for (const [selector, activeClass] of [['#soloDriver', 'soloed'], ['#muteDriver', 'muted']]) {
                await page.locator(selector).click();
                assert(await page.locator(selector).evaluate((el, name) => el.classList.contains(name), activeClass),
                    'Master Beat mix controls should work while collapsed.', { viewport, selector });
                await page.locator(selector).click();
            }
            assert(await page.locator('#volDriver').isVisible(), 'Opening Master Beat should reveal its volume control.');
            await page.locator('#masterBeatControls .rail-toggle-btn').click();
            await page.locator('#masterPatternControls > summary').click();
            for (const selector of ['#masterPhraseCycles', '#clearMasterBtn', '#masterInfoBtn',
                '#masterPatternControls .cycle-nav', '#masterPatternControls .lane-edit-controls',
                '#masterPatternControls .group-nudge-control']) {
                assert(await page.locator(selector).isVisible(),
                    'The Master panel should expose shared phrase, editing, and navigation controls.', { viewport, selector });
            }
            await page.locator('#masterPatternControls > summary').click();
            for (const selector of ['#resetBtn', '#transportReadout', '.toolbar-status .mini-playhead']) {
                assert(await page.locator(selector).isVisible() && await page.locator(selector).evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    const pinned = document.querySelector('.toolbar-pinned').getBoundingClientRect();
                    return rect.left >= pinned.left && rect.right <= pinned.right + 1 &&
                        rect.top >= pinned.top && rect.bottom <= pinned.bottom + 1;
                }), 'Reset and cycle position should remain visible inside the pinned strip.', { viewport, selector });
            }
            await page.waitForFunction(() => document.querySelector('#transportReadout')?.textContent.includes('Cycle'));
            const progressBefore = await page.locator('#miniPlayhead').evaluate(el => el.style.transform);
            await page.waitForFunction(previous => document.querySelector('#miniPlayhead')?.style.transform !== previous, progressBefore);
            await page.locator('#groupingLanesContainer').scrollIntoViewIfNeeded();
            assert(await page.locator('#resetBtn').evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.top >= 0 && rect.bottom <= innerHeight;
            }), 'Reset should remain on screen when scrolling to the rhythm tracks.', viewport);
            await page.locator('#resetBtn').click();
            assert(await page.locator('#soundDriver').inputValue() === 'kick' &&
                !(await page.locator('#masterPatternControls').evaluate(el => el.open)) &&
                await page.locator('#muteDriver').textContent() === 'M',
                'Reset should restore the Beat instrument, compact mix labels, and closed Master panel.');
            assert(await page.locator('#stickyBarToggle').getAttribute('aria-expanded') === 'false',
                'Reset should be usable without opening additional controls.');
            assert(await page.locator('h1.app-brand').isVisible() && await page.locator('#toolbarControls h1').count() === 0,
                'App branding should stay visible outside the collapsed controls.');
            assert(await page.locator('h1.app-brand').evaluate(el =>
                el.getBoundingClientRect().bottom <= document.querySelector('#stickyBar').getBoundingClientRect().top),
                'App branding should appear above the playback strip on small screens.');
            await page.locator('#stickyBarToggle').click();
            assert(await page.locator('#tempoSlider').isVisible() && await page.locator('#resetBtn').isVisible(),
                'Opening Controls should expose settings and utility actions.');
            await page.locator('#helpBtn').click();
            assert(await page.locator('#helpModal').isVisible(), 'Help should remain accessible from Controls.');
            await page.locator('#closeHelpModalBtn').click();
            await page.locator('#stickyBarToggle').click();
            assert(!(await page.locator('#toolbarControls').isVisible()), 'Closing Controls should hide the additional panel.');
            await page.locator('#collapseAllRailsBtn').click();
            await page.waitForTimeout(120);
            const collapsedLanes = await page.locator('#groupingLanesContainer .grouping-lane-row').evaluateAll(rows =>
                rows.map(row => {
                    const rail = row.querySelector('.lane-label-area');
                    const grid = row.querySelector('.voice-steps').getBoundingClientRect();
                    const toggle = rail.querySelector('.rail-toggle-btn').getBoundingClientRect();
                    return {
                        top: grid.top, bottom: grid.bottom,
                        instrumentWidth: rail.querySelector('.voice-instrument-select').getBoundingClientRect().width,
                        commonControls: [...rail.querySelectorAll('.identity-group select, .head-mix-controls button')]
                            .map(control => {
                                const rect = control.getBoundingClientRect();
                                return { left: rect.left, right: rect.right, top: rect.top, height: rect.height };
                            }),
                        deeperControlsHidden: rail.querySelector('.track-group').getBoundingClientRect().width === 0,
                        toggleWidth: toggle.width, toggleHeight: toggle.height,
                        expanded: rail.querySelector('.rail-toggle-btn').getAttribute('aria-expanded')
                    };
                }));
            assert(collapsedLanes.every(lane => lane.instrumentWidth >= 70 && lane.instrumentWidth <= 141 &&
                lane.deeperControlsHidden && lane.expanded === 'false' &&
                lane.toggleWidth >= 44 && lane.toggleHeight >= 44),
                'Collapsed lanes should retain instruments and disclosures while hiding deeper editing controls.', { viewport, collapsedLanes });
            assert(collapsedLanes.every(lane => lane.commonControls.every(control =>
                control.height >= 44 && control.left >= 0 && control.right <= viewport.width &&
                (viewport.width <= 480 || Math.abs(control.top - lane.commonControls[0].top) < 1))),
                'Common controls should fit compact headers with comfortable touch targets.', { viewport, collapsedLanes });
            assert(collapsedLanes.every((lane, index) => index === 0 ||
                lane.top - collapsedLanes[index - 1].bottom <= (viewport.width <= 480 ? 98 : 52)),
                'Phone lanes should stack with compact control rows between step grids.', { viewport, collapsedLanes });
            const compactRail = page.locator('#groupingLanesContainer .lane-label-area').first();
            for (const selector of ['.solo-btn', '.mute-btn', '.compact-clear-btn']) {
                assert(!(await compactRail.locator(selector).isVisible()),
                    'Collapsed voices should hide Solo, Mute and Clear.', { viewport, selector });
            }
            assert(await compactRail.locator('.compact-delete-btn').isVisible(),
                'Delete should remain available when the voice is collapsed.');
            await compactRail.locator('.rail-toggle-btn').click();
            for (const selector of ['.solo-btn', '.mute-btn']) {
                await compactRail.locator(selector).click();
                assert(await compactRail.locator(selector).evaluate((el, activeClass) => el.classList.contains(activeClass),
                    selector === '.solo-btn' ? 'soloed' : 'muted'),
                    'Mix controls should work in the expanded rail.', { viewport, selector });
                await compactRail.locator(selector).click();
            }
            await compactRail.locator('.voice-instrument-select').selectOption('snare');
            const otherPatternBeforeClear = await page.locator('#groupingLanesContainer .grouping-lane-row').nth(1)
                .locator('.step-btn[aria-pressed="true"]').count();
            await compactRail.locator('.compact-clear-btn').click();
            assert(await page.locator('#groupingLanesContainer .grouping-lane-row').first()
                .locator('.step-btn[aria-pressed="true"]').count() === 0 &&
                await page.locator('#groupingLanesContainer .grouping-lane-row').nth(1)
                    .locator('.step-btn[aria-pressed="true"]').count() === otherPatternBeforeClear,
                'Compact Clear should clear only its voice pattern.');
            if (viewport.width <= 480) {
                assert(await compactRail.locator('.pattern-group').isVisible() &&
                    !(await compactRail.locator('.track-group').isVisible()) &&
                    await compactRail.locator('[data-panel="pattern"]').getAttribute('aria-pressed') === 'true',
                    'Narrow phones should start with Pattern selected and Timing hidden.');
                await compactRail.locator('[data-panel="timing"]').click();
            }
            assert(await compactRail.locator('.track-group').isVisible(),
                'Timing controls should be reachable after opening a compact track.');
            if (viewport.width <= 480) {
                assert(!(await compactRail.locator('.pattern-group').isVisible()) &&
                    await compactRail.locator('[data-panel="timing"]').getAttribute('aria-pressed') === 'true',
                    'Selecting Timing should hide Pattern and expose the selected state.');
                await compactRail.locator('.grouping-count-select').selectOption('4');
                await page.waitForTimeout(160);
                assert(await compactRail.locator('[data-panel="timing"]').getAttribute('aria-pressed') === 'true' &&
                    await compactRail.locator('.grouping-count-select').inputValue() === '4',
                    'The selected editing section and timing setting should survive a lane rebuild.');
                await compactRail.locator('.rail-toggle-btn').click();
                await compactRail.locator('.rail-toggle-btn').click();
                assert(await compactRail.locator('.track-group').isVisible(),
                    'Reopening a lane should retain the selected editing section.');
                await compactRail.locator('[data-panel="pattern"]').click();
                await compactRail.locator('.voice-edit-controls button').first().click();
                await compactRail.locator('[data-panel="timing"]').click();
                assert(await compactRail.locator('.grouping-count-select').inputValue() === '4',
                    'Editing a pattern and switching sections should retain the timing settings.');
                await page.setViewportSize({ width: 768, height: 900 });
                assert(await compactRail.locator('.pattern-group').isVisible() &&
                    await compactRail.locator('.track-group').isVisible() &&
                    !(await compactRail.locator('.voice-panel-switch').isVisible()),
                    'Wider screens should show both editing sections without redundant section buttons.');
                await page.setViewportSize(viewport);
                assert(await compactRail.locator('.track-group').isVisible() &&
                    !(await compactRail.locator('.pattern-group').isVisible()),
                    'Returning to a narrow phone should retain the selected editing section.');
            }
            assert(await compactRail.locator('.voice-instrument-select').inputValue() === 'snare',
                'The instrument chosen from a compact rail should remain selected when expanded.');
            await page.locator('#expandAllRailsBtn').click();
            await page.waitForTimeout(160);
            const voiceLayout = await page.locator('#groupingLanesContainer .lane-label-area').first().evaluate(el => {
                const rail = el.getBoundingClientRect();
                const instrument = el.querySelector('.voice-instrument-select').getBoundingClientRect();
                return {
                    instrumentWidth: instrument.width,
                    railWidth: rail.width,
                    railHeight: rail.height,
                    trackSettingsSeparate: !!el.querySelector(':scope > .track-group .grouping-count-select'),
                    clearInHeader: !!el.querySelector('.expanded-mix-actions button[title^="Clear voice"]'),
                    touchTargets: [...el.querySelectorAll('button')].filter(button => button.getBoundingClientRect().width > 0)
                        .map(button => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
                    overflow: [...el.querySelectorAll('select, button, input')].some(control =>
                        control.getBoundingClientRect().width > 0 && control.getBoundingClientRect().right > rail.right + 1)
                };
            });
            assert(voiceLayout.instrumentWidth >= 70 && voiceLayout.instrumentWidth <= 141 && !voiceLayout.overflow,
                'Expanded instrument selectors should stay compact without clipping controls.', { viewport, voiceLayout });
            assert(voiceLayout.railHeight <= (viewport.width <= 480 ? 350 : 300),
                'Expanded phone and landscape controls should conserve vertical space.', { viewport, voiceLayout });
            assert(voiceLayout.trackSettingsSeparate && voiceLayout.clearInHeader,
                'Track timing should be separate from pattern editing, with Clear in the expanded mix controls.', voiceLayout);
            assert(voiceLayout.touchTargets.every(rect => rect.width >= 43 && rect.height >= 44),
                'Expanded voice controls should retain comfortable touch targets.', { viewport, voiceLayout });
            if (viewport.width <= 480) {
                await compactRail.locator('[data-panel="pattern"]').click();
                const patternLayout = await compactRail.evaluate(el => ({
                    height: el.getBoundingClientRect().height,
                    targets: [...el.querySelectorAll('.pattern-group button')].map(button => {
                        const rect = button.getBoundingClientRect();
                        return { width: rect.width, height: rect.height };
                    })
                }));
                assert(patternLayout.height <= 350 &&
                    patternLayout.targets.every(rect => rect.width >= 43 && rect.height >= 44),
                    'The Pattern section should also fit within the height budget with usable targets.',
                    { viewport, patternLayout });
            }
            await page.locator('#collapseAllRailsBtn').click();
            await page.locator('#groupingLanesContainer .compact-delete-btn').first().click();
            assert(await page.locator('#groupingLanesContainer .grouping-lane-row').count() === 1 &&
                await page.locator('#groupingLanesContainer .voice-label').first().textContent() === 'Voice 1',
                'Compact Delete should remove its grouping track and renumber the remaining track.');
            await page.locator('#addMasterVoiceBtn').click();
            assert(await page.locator('#masterGrid .compact-delete-btn').count() === 2,
                'Every Master voice should expose Delete.');
            await page.locator('#masterGrid .compact-delete-btn').last().click();
            assert(await page.locator('#masterGrid .voice-row').count() === 1,
                'Compact Delete should remove an extra Master voice without removing the Master lane.');
            await page.locator('#masterGrid .compact-delete-btn').click();
            assert(await page.locator('#masterGrid .voice-row').count() === 0 &&
                await page.locator('.master-beat-grid').isVisible() &&
                await page.locator('#addMasterVoiceBtn').isVisible(),
                'Removing the last Master voice should retain the Beat reference and Add Voice.');
            await page.locator('#addMasterVoiceBtn').click();
            assert(await page.locator('#masterGrid .voice-row').count() === 1 &&
                await page.locator('#sound_master_0').isVisible(),
                'Add Voice should recreate a usable first Master voice after the lane is emptied.');
            assert(await page.locator('#masterBeatControls .compact-clear-btn, #masterBeatControls .compact-delete-btn').count() === 0,
                'The reference Beat should not expose pattern Clear or Delete.');
        }

        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.reload();
            await page.waitForFunction(() => document.querySelector('#playBtn')?.textContent === 'Pause');
            const help = page.locator('#beatSchemeInfoBtn');
            const explanation = page.locator('#beatSchemeDescription');
            assert(await help.isVisible() && !(await explanation.isVisible()),
                'Meter help should be discoverable with its explanation initially hidden.', { width });
            await help.focus();
            await page.keyboard.press('Enter');
            assert(await explanation.isVisible() && await help.getAttribute('aria-expanded') === 'true' &&
                (await explanation.textContent()).includes('Master Cycle (12 pulses per cycle)'),
                'Keyboard activation should explain the initial 6 against 4 grid.', { width });
            await page.locator('#rhythmA').selectOption('5');
            assert((await explanation.textContent()).includes('5 against 4') &&
                (await explanation.textContent()).includes('Master Cycle (20 pulses per cycle)') &&
                (await explanation.textContent()).includes('Meter A (5 beats per cycle) · 5 groups of 4 beats') &&
                (await explanation.textContent()).includes('Meter B (4 beats per cycle) · 4 groups of 5 beats'),
                'Open meter help should update its ratio and grid arithmetic.', { width });
            assert(await help.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth &&
                    document.documentElement.scrollWidth <= innerWidth;
            }), 'Meter help should fit without horizontal overflow.', { width });
            await help.click();
            assert(!(await explanation.isVisible()) && await help.getAttribute('aria-expanded') === 'false',
                'Meter help should close independently of lane controls.', { width });
            await page.locator('#resetBtn').click();
            assert((await explanation.textContent()).includes('6 against 4'),
                'Reset should restore the meter explanation.', { width });
        }

        for (const width of [320, 390, 600, 768]) {
            await page.setViewportSize({ width, height: 844 });
            await page.reload();
            await page.waitForFunction(() => document.querySelector('#playBtn')?.textContent === 'Pause');
            for (const selector of ['#masterBeatControls .rail-toggle-btn', '#masterGrid .rail-toggle-btn', '#groupingLanesContainer .rail-toggle-btn']) {
                const toggle = page.locator(selector).first();
                await toggle.evaluate(button => {
                    window.scrollTo(0, Math.max(0, button.getBoundingClientRect().top + scrollY - 200));
                });
                await page.waitForTimeout(180);
                const before = await toggle.evaluate(button => ({ top: button.getBoundingClientRect().top, scroll: scrollY }));
                await toggle.click();
                await page.waitForTimeout(250);
                const expanded = await toggle.evaluate(button => ({ top: button.getBoundingClientRect().top, scroll: scrollY }));
                assert(Math.abs(expanded.top - before.top) <= 2 && Math.abs(expanded.scroll - before.scroll) <= 1,
                    'Expanding a lane should keep the disclosure where the user tapped it.', { width, selector, before, expanded });
                await toggle.click();
                await page.waitForTimeout(250);
                const collapsed = await toggle.evaluate(button => ({ top: button.getBoundingClientRect().top, scroll: scrollY }));
                assert(Math.abs(collapsed.top - before.top) <= 2 && Math.abs(collapsed.scroll - before.scroll) <= 1,
                    'Collapsing a lane should preserve the disclosure position.', { width, selector, before, collapsed });
            }
        }

        for (const width of [768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.reload();
            await page.waitForFunction(() => document.querySelector('#playBtn')?.textContent === 'Pause');
            await page.waitForTimeout(160);
            assert(await page.locator('#stickyBarToggle').getAttribute('aria-expanded') === 'false' &&
                !(await page.locator('#toolbarControls').isVisible()),
                'Top controls should also start collapsed on wider screens.', { width });
            const inlineLanes = await page.locator('#groupingLanesContainer .voice-row').evaluateAll(rows =>
                rows.map(row => {
                    const rail = row.querySelector('.lane-label-area').getBoundingClientRect();
                    const grid = row.querySelector('.voice-steps').getBoundingClientRect();
                    const select = row.querySelector('.voice-instrument-select').getBoundingClientRect();
                    return { railWidth: rail.width, railRight: rail.right, gridLeft: grid.left, top: grid.top, bottom: grid.bottom,
                        selectWidth: select.width, aligned: Math.abs(rail.top - grid.top) < 1 };
                }));
            assert(inlineLanes.every((lane, index) => lane.aligned && lane.selectWidth >= 130 && lane.selectWidth <= 141 &&
                Math.abs(lane.railWidth - 232) < 1 &&
                lane.railRight <= lane.gridLeft && (index === 0 || lane.top - inlineLanes[index - 1].bottom <= 6)),
                'Wider screens should reclaim 100px from the header and retain tightly stacked step grids.', { width, inlineLanes });
        }

        for (const width of [320, 360, 390, 430, 480, 481, 539, 540, 599, 600, 666, 667, 720, 721, 768, 859, 860, 900, 949, 950, 1024, 1260, 1279, 1280, 1369, 1370, 1399, 1400, 1440, 1600, 1920]) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(180);
            assert(await page.locator('#beatSchemeInfoBtn').evaluate(button => {
                const help = button.getBoundingClientRect();
                const meter = document.querySelector('#rhythmB').getBoundingClientRect();
                return help.left >= meter.right && Math.abs(help.top + help.height / 2 - meter.top - meter.height / 2) <= 1;
            }), 'Meter help should always sit to the right of Meter B on the same row.', { width });
            {
                await page.locator('#masterPatternControls > summary').click();
                await page.waitForTimeout(180);
                const masterPanel = await page.locator('#masterPatternControls .lane-toolbar').evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    const items = [...el.querySelectorAll('.meter-master-select, .lane-edit-controls button, #clearMasterBtn, .group-nudge-control, .lane-view-actions')];
                    const rows = [];
                    let unnecessaryWrap = false;
                    const availableWidth = el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) -
                        parseFloat(getComputedStyle(el).paddingRight);
                    const gap = parseFloat(getComputedStyle(el).columnGap);
                    let used = 0;
                    items.forEach(item => {
                        const bounds = item.getBoundingClientRect();
                        const center = Math.round(bounds.top + bounds.height / 2);
                        if (rows.length && rows[rows.length - 1] !== center) {
                            if (used + gap + bounds.width <= availableWidth - 1) unnecessaryWrap = true;
                            used = 0;
                        }
                        if (rows[rows.length - 1] !== center) rows.push(center);
                        used += (used ? gap : 0) + bounds.width;
                    });
                    return {
                        height: rect.height,
                        rows: rows.length,
                        unnecessaryWrap,
                        controlsFit: [...el.querySelectorAll('button, select')].every(control => {
                            const bounds = control.getBoundingClientRect();
                            return (innerWidth > 720 || (bounds.width >= 43 && bounds.height >= 43)) &&
                                bounds.left >= rect.left - 1 && bounds.right <= rect.right + 1;
                        })
                    };
                });
                assert(masterPanel.controlsFit && !masterPanel.unnecessaryWrap &&
                    masterPanel.height <= (width <= 480 ? 210 : width <= 539 ? 165 : width <= 720 ? 110 : width < 950 ? 85 : 50),
                    'Shared Master controls should fill compact rows without clipping or unnecessary breaks.',
                    { width, masterPanel });
                await page.locator('#masterPatternControls > summary').click();
            }
            await page.locator('#collapseAllRailsBtn').click();
            await page.waitForTimeout(180);
            const collapsedActions = await page.locator('.sequencer-workspace .expanded-mix-actions button').evaluateAll(buttons =>
                buttons.every(button => button.getBoundingClientRect().width === 0));
            assert(collapsedActions, 'Solo, Mute and Clear should hide for every collapsed lane.', { width });
            const measureGrids = () => page.locator('.master-beat-voice-row, #masterGrid .voice-row, #groupingLanesContainer .voice-row')
                .evaluateAll(rows => rows.map(row => {
                    const grid = row.querySelector('.voice-steps').getBoundingClientRect();
                    const cells = [...row.querySelectorAll('.voice-steps .step-btn')].map(cell => {
                        const rect = cell.getBoundingClientRect();
                        return { left: rect.left + scrollX, width: rect.width, height: rect.height };
                    });
                    return { left: grid.left + scrollX, width: grid.width, cells };
                }));
            const before = await measureGrids();
            const toggles = page.locator('.master-beat-voice-row .rail-toggle-btn, #masterGrid .rail-toggle-btn, #groupingLanesContainer .rail-toggle-btn');
            for (let index = 0; index < await toggles.count(); index++) {
                await toggles.nth(index).click();
                await page.waitForTimeout(180);
                assert(await toggles.nth(index).evaluate(button =>
                    [...button.closest('.lane-label-area').querySelectorAll('.expanded-mix-actions button')]
                        .every(control => control.getBoundingClientRect().width > 0)),
                    'Expanding a lane should reveal all its mix actions.', { width, index });
                const after = await measureGrids();
                const expandedLayout = await toggles.nth(index).evaluate(button => {
                    const rail = button.closest('.lane-label-area');
                    const rect = rail.getBoundingClientRect();
                    const flowSelector = '.identity-group, .lane-volume, .expanded-mix-actions button, .voice-panel-switch, .voice-edit-controls button, .voice-nudge-control, .grouping-controls .control-group, .lane-header-view-actions';
                    const flowItems = [...rail.querySelectorAll(flowSelector)]
                        .filter(item => item.getBoundingClientRect().width > 0)
                        .sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order));
                    const centers = flowItems.map(item => {
                        const bounds = item.getBoundingClientRect();
                        return Math.round(bounds.top + bounds.height / 2);
                    });
                    const clone = rail.cloneNode(true);
                    clone.style.visibility = 'hidden';
                    clone.style.position = 'fixed';
                    clone.style.width = `${rect.width}px`;
                    clone.style.flexWrap = 'nowrap';
                    rail.parentElement.appendChild(clone);
                    const naturalItems = [...clone.querySelectorAll(flowSelector)]
                        .filter(item => getComputedStyle(item).display !== 'none' && item.getBoundingClientRect().width > 0)
                        .sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order));
                    naturalItems.forEach(item => { item.style.flexGrow = '0'; });
                    const widths = naturalItems.map(item => item.getBoundingClientRect().width);
                    clone.remove();
                    const gap = parseFloat(getComputedStyle(rail).columnGap);
                    let used = 0;
                    let unnecessaryWrap = false;
                    centers.forEach((center, i) => {
                        if (i && center !== centers[i - 1]) {
                            if (used + gap + widths[i] <= rect.width - 1) unnecessaryWrap = true;
                            used = 0;
                        }
                        used += (used ? gap : 0) + widths[i];
                    });
                    return {
                        height: rect.height,
                        grouping: !!rail.dataset.controlPanel,
                        beat: rail.classList.contains('master-beat-rail'),
                        instrumentWidth: rail.querySelector('select').getBoundingClientRect().width,
                        volumeWidth: rail.querySelector('.volume-fader').getBoundingClientRect().width,
                        rowCenters: [...new Set(centers)],
                        naturalWidth: widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1),
                        unnecessaryWrap,
                        touchTargets: [...rail.querySelectorAll('button')].filter(control => control.getBoundingClientRect().width > 0)
                            .every(control => {
                                const bounds = control.getBoundingClientRect();
                                return bounds.width >= 43 && bounds.height >= 43;
                            }),
                        overflow: document.documentElement.scrollWidth > innerWidth,
                        singleRow: new Set(centers).size === 1,
                        clippedLabels: [...rail.querySelectorAll('.grouping-controls label')]
                            .some(label => label.scrollWidth > label.clientWidth + 1),
                        clippedControls: [...rail.querySelectorAll('select, button, input')]
                            .filter(control => control.getBoundingClientRect().width > 0)
                            .some(control => {
                                const bounds = control.getBoundingClientRect();
                                return bounds.left < rect.left - 1 || bounds.right > rect.right + 1;
                            })
                    };
                });
                assert(!expandedLayout.overflow && !expandedLayout.clippedControls && expandedLayout.volumeWidth >= 140 &&
                    expandedLayout.height <= (width <= 480 ? 350 : width <= 720 ? 340 : width <= 1023 ? 160 : width < 1370 ? 140 : 50),
                    'Expanded controls should fit their rail and responsive height budget.', { width, index, expandedLayout });
                assert(!expandedLayout.unnecessaryWrap,
                    'A control cluster should only wrap when it cannot fit on the preceding row.',
                    { width, index, expandedLayout });
                if (width <= 720) {
                    assert(expandedLayout.touchTargets,
                        'Every expanded Rhythm Tracks rail should retain touch-friendly controls.',
                        { width, index, expandedLayout });
                    const smallHeightBudget = expandedLayout.beat ? (width >= 600 ? 50 : width >= 390 ? 95 : 145) :
                            expandedLayout.grouping ? (width <= 480 ? 305 : width < 600 ? 260 : 200) :
                                (width <= 480 ? 245 : width < 600 ? 185 : 135);
                    assert(expandedLayout.height <= smallHeightBudget,
                        'Small-screen Beat, Master and grouping rails should avoid unnecessary control rows.',
                        { width, index, smallHeightBudget, expandedLayout });
                }
                const availableWidth = await toggles.nth(index).evaluate(button => button.closest('.lane-label-area').clientWidth);
                if (expandedLayout.naturalWidth <= availableWidth - 1) {
                    assert(expandedLayout.singleRow && !expandedLayout.clippedLabels &&
                        expandedLayout.height <= (width <= 720 ? 75 : 50) && expandedLayout.instrumentWidth >= 100,
                        'Every control should stay in one row whenever its measured minimum widths fit.',
                        { width, index, expandedLayout });
                }
                if (!expandedLayout.grouping && !expandedLayout.beat && width >= 721 && width <= 949) {
                    assert(expandedLayout.rowCenters.length <= 2 && expandedLayout.height <= 75,
                        'Master voice controls should occupy at most two compact rows at tablet widths.',
                        { width, index, expandedLayout });
                }
                if (expandedLayout.grouping && width >= 600 && width < 1370) {
                    assert(expandedLayout.rowCenters.length <= (width >= 950 ? 2 : 3) &&
                        !expandedLayout.clippedLabels &&
                        expandedLayout.height <= (width >= 950 ? 95 : width >= 721 ? 120 : 200),
                        'Grouping controls should use at most two or three compact rows at intermediate widths.',
                        { width, index, expandedLayout });
                    if (width <= 720) {
                        assert(expandedLayout.touchTargets,
                            'Three-row phone controls should retain touch-friendly buttons.', { width, expandedLayout });
                    }
                }
                assert(after.every((grid, row) => Math.abs(grid.left - before[row].left) < 1 &&
                    Math.abs(grid.width - before[row].width) < 1 &&
                    grid.cells.every((cell, position) => {
                        const original = before[row].cells[position];
                        return Math.abs(cell.left - original.left) < 1 &&
                            Math.abs(cell.width - original.width) < 1 &&
                            Math.abs(cell.height - original.height) < 1;
                    })),
                    'Opening a lane should preserve every grid and step column horizontally.', { width, index, before, after });
                await toggles.nth(index).click();
                await page.waitForTimeout(180);
            }
        }

        await page.locator('#stickyBarToggle').click();
        await page.setViewportSize({ width: 390, height: 844 });
        assert(await page.locator('#stickyBarToggle').getAttribute('aria-expanded') === 'true',
            'Resizing should preserve a user-opened top controls panel.');
        await page.locator('#stickyBarToggle').click();
        await page.setViewportSize({ width: 1440, height: 900 });
        assert(await page.locator('#stickyBarToggle').getAttribute('aria-expanded') === 'false',
            'Resizing should not reopen a user-closed top controls panel.');
        await page.locator('#masterGrid .compact-delete-btn').click();
        await setSelect('#rhythmA', 3);
        assert(await page.locator('#masterGrid .voice-row').count() === 0,
            'Meter changes should preserve an empty Master lane.');
        await page.locator('#stickyBarToggle').click();
        await page.locator('#shareBtn').click();
        await page.waitForFunction(() => globalThis.__lastCopiedShareUrl?.includes('?s='));
        const emptyMasterShareUrl = await page.evaluate(() => globalThis.__lastCopiedShareUrl);
        await page.goto(emptyMasterShareUrl, { waitUntil: 'networkidle' });
        await page.waitForSelector('.master-beat-grid');
        assert(await page.locator('#masterGrid .voice-row').count() === 0,
            'Sharing and loading should preserve zero Master voices.');
        await page.locator('#addMasterVoiceBtn').click();
        await waitForApp();
        assert(await page.locator('#masterGrid .voice-row').count() === 1,
            'A shared empty Master lane should allow adding a fresh voice.');
        await page.locator('#masterGrid .compact-delete-btn').click();
        await page.locator('#resetBtn').click();
        await waitForApp();
        assert(await page.locator('#masterGrid .voice-row').count() === 1,
            'Reset should restore the starting Master voice after the lane is emptied.');

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