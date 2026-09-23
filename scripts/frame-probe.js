#!/usr/bin/env node
/**
 * frame-probe.js — frame-delta profiler for the visualization views.
 *
 * Loads the app with CPU throttling (emulating a low-end tablet), starts
 * playback, then samples requestAnimationFrame deltas in each viz mode
 * (gears / rings / align / voice / shapes) and prints p50/p95/max per mode.
 *
 * Run:
 *   node scripts/frame-probe.js
 *
 * Environment variables:
 *   CPU_RATE=4        CPU throttling factor (default 4).
 *   DENSE=1           Set meters to 12 against 18 before probing.
 *   LANES=6           Add grouping voice lanes until the list has this many.
 *   SAMPLES=75        Number of rAF samples per mode (default 75 ≈ 2.5s@30fps).
 *   BASE_URL=...      Use an already-running server instead of starting one.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (err) {
    console.error('Playwright is required. Run: npm install --save-dev playwright && npx playwright install chromium');
    process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PORT || '8123', 10);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const CPU_RATE = Number.parseFloat(process.env.CPU_RATE || '4');
const SAMPLES = Number.parseInt(process.env.SAMPLES || '75', 10);
const DENSE = process.env.DENSE === '1';
const LANES = Number.parseInt(process.env.LANES || '2', 10);
const HELP_STORAGE_KEY = 'alans-polyrhythm-mixer-help-dismissed';

const MODES = ['gears', 'rings', 'align', 'voice', 'shapes'];

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

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
}

async function run() {
    const server = process.env.BASE_URL ? null : await startStaticServer();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1180, height: 820 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 1
    });
    const page = await context.newPage();
    await page.addInitScript((helpKey) => {
        localStorage.setItem(helpKey, 'true');
    }, HELP_STORAGE_KEY);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });

    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`${BASE_URL}/?cache-bust=frame-probe-${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#masterGrid .voice-row:first-child .step-btn', { timeout: 10000 });

    if (DENSE) {
        await page.selectOption('#rhythmA', '12');
        await page.locator('#rhythmA').dispatchEvent('change');
        await page.selectOption('#rhythmB', '18');
        await page.locator('#rhythmB').dispatchEvent('change');
    }

    // Add grouping voice lanes (each is one voice with its own grouping) to
    // stress the Rhythm Tracks list, scheduler, and timeline.
    for (let i = 2; i < LANES; i++) {
        await page.locator('#groupingLanesContainer .add-voice-btn').click();
        await page.waitForTimeout(40);
    }

    // Start the transport so the canvas loop runs at full rate.
    await page.locator('#audioBtn').click();
    await page.waitForTimeout(800);

    const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
    const meter = await page.evaluate(() => `${document.querySelector('#rhythmA')?.value}×${document.querySelector('#rhythmB')?.value}`);
    const lanes = await page.evaluate(() => document.querySelectorAll('#groupingLanesContainer .grouping-lane-row').length);

    // Instrument rAF callbacks: capture both the wall-clock delta between
    // frames and the JS self-time of each callback (the drawing work). Each
    // delta is also paired with the master-cycle phase at that frame, so a
    // periodic spike at the measure boundary can be detected.
    await page.evaluate(() => {
        window.__paProbe = true;
        const raf = window.requestAnimationFrame.bind(window);
        window.__frameStats = { deltas: [], self: [], phase: [] };
        let last = null;
        window.requestAnimationFrame = (cb) => raf((now) => {
            const phase = window.__paCyclePhase != null ? window.__paCyclePhase : null;
            if (last !== null) { window.__frameStats.deltas.push(now - last); window.__frameStats.phase.push(phase); }
            last = now;
            const t0 = performance.now();
            cb(now);
            window.__frameStats.self.push(performance.now() - t0);
        });
    });

    const sample = async () => {
        const stats = await page.evaluate(() => {
            const s = window.__frameStats;
            window.__frameStats = { deltas: [], self: [], phase: [] };
            return s;
        });
        const self = [...stats.self].sort((a, b) => a - b);
        const deltas = [...stats.deltas].sort((a, b) => a - b);
        const pick = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);

        // Measure-boundary spike detector: compare frame deltas whose
        // master-cycle phase sits within a small window of the cycle start
        // (phase near 0 or 1, i.e. crossing the boundary) against all other
        // samples. A periodic rebuild at the measure boundary shows up as a
        // boundary delta well above the elsewhere distribution.
        let bMax = 0, bN = 0, oMax = 0, oN = 0;
        const oDeltas = [];
        for (let i = 0; i < stats.deltas.length; i++) {
            const ph = stats.phase[i];
            const d = stats.deltas[i];
            if (ph == null) continue;
            // Window straddling the 0/1 boundary (width 0.12 of the cycle).
            const near = ph < 0.06 || ph > 0.94;
            if (near) { if (d > bMax) bMax = d; bN++; }
            else { if (d > oMax) oMax = d; oN++; oDeltas.push(d); }
        }
        oDeltas.sort((a, b) => a - b);
        const elsewhereP95 = pick(oDeltas, 95);

        return {
            n: self.length,
            selfP50: pick(self, 50),
            selfP95: pick(self, 95),
            selfMax: self[self.length - 1] || 0,
            deltaP95: pick(deltas, 95),
            deltaMax: deltas[deltas.length - 1] || 0,
            boundaryMax: bMax,
            elsewhereP95
        };
    };

    const results = [];
    for (const mode of MODES) {
        const id = `#vizMode${mode[0].toUpperCase()}${mode.slice(1)}`;
        await page.locator(id).click();
        await page.waitForTimeout(700); // settle: sprite rebuilds happen on first frames
        const r = await sample();
        results.push({ mode, ...r });
    }

    console.log(`frame-probe: CPU throttle ×${CPU_RATE}, pointer-coarse=${coarse}, meter=${meter}, groupingLanes=${lanes}, samples/mode≈${SAMPLES}`);
    console.log('mode    n    cbP50   cbP95   cbMax   Δp95    Δmax    Δbound  ΔelseΔp95   (ms; cb = rAF callback JS self-time)');
    for (const r of results) {
        console.log(
            String(r.mode).padEnd(8),
            String(r.n).padEnd(5),
            r.selfP50.toFixed(1).padEnd(8),
            r.selfP95.toFixed(1).padEnd(8),
            r.selfMax.toFixed(1).padEnd(8),
            r.deltaP95.toFixed(1).padEnd(8),
            r.deltaMax.toFixed(1).padEnd(8),
            r.boundaryMax.toFixed(1).padEnd(8),
            r.elsewhereP95.toFixed(1)
        );
    }

    if (pageErrors.length) {
        console.error('Page errors during probe:', pageErrors);
    }

    await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
