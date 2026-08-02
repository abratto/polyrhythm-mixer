const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve('/home/runner/work/polyrhythm-mixer/polyrhythm-mixer');
const PORT = 9999;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function contentTypeFor(filePath) {
    if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
    if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
    return 'application/octet-stream';
}

async function main() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, BASE_URL);
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        const filePath = path.normalize(path.join(ROOT, pathname));
        if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
        fs.readFile(filePath, (err, data) => {
            if (err) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
            res.end(data);
        });
    });
    
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', resolve); });
    console.log(`Server started on ${BASE_URL}`);
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // Dismiss help modal if present
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    
    // Capture initial wheel button count
    const initialWheelA = await page.locator('#meterAWheelGrid .step-btn').count();
    const initialWheelB = await page.locator('#meterBWheelGrid .step-btn').count();
    const initialBeatSchemeSummary = await page.locator('#beatSchemeSummary').textContent();
    const initialDescription = await page.locator('#aWheelDescription').textContent();
    const initialTitleA = await page.locator('#titleAWheel').textContent();
    
    console.log(`Initial state:`);
    console.log(`  beatSchemeSummary: "${initialBeatSchemeSummary}"`);
    console.log(`  titleAWheel: "${initialTitleA}"`);
    console.log(`  aWheelDescription: "${initialDescription}"`);
    console.log(`  wheelA buttons: ${initialWheelA}`);
    console.log(`  wheelB buttons: ${initialWheelB}`);
    
    // Change A from 6 to 7
    await page.selectOption('#rhythmA', '7');
    await page.locator('#rhythmA').dispatchEvent('change');
    await page.waitForTimeout(300);
    
    const afterChangeWheelA = await page.locator('#meterAWheelGrid .step-btn').count();
    const afterChangeBeatScheme = await page.locator('#beatSchemeSummary').textContent();
    const afterChangeTitleA = await page.locator('#titleAWheel').textContent();
    const afterChangeDesc = await page.locator('#aWheelDescription').textContent();
    
    console.log(`\nAfter changing A to 7:`);
    console.log(`  beatSchemeSummary: "${afterChangeBeatScheme}"`);
    console.log(`  titleAWheel: "${afterChangeTitleA}"`);
    console.log(`  aWheelDescription: "${afterChangeDesc}"`);
    console.log(`  wheelA buttons: ${afterChangeWheelA}`);
    
    // Click Reset Mixer
    await page.locator('#resetBtn').click();
    await page.waitForFunction(() => document.querySelector('#rhythmA')?.value === '6');
    await page.waitForTimeout(300);
    
    const afterResetWheelA = await page.locator('#meterAWheelGrid .step-btn').count();
    const afterResetBeatScheme = await page.locator('#beatSchemeSummary').textContent();
    const afterResetTitleA = await page.locator('#titleAWheel').textContent();
    const afterResetDesc = await page.locator('#aWheelDescription').textContent();
    
    console.log(`\nAfter Reset Mixer:`);
    console.log(`  beatSchemeSummary: "${afterResetBeatScheme}"`);
    console.log(`  titleAWheel: "${afterResetTitleA}"`);
    console.log(`  aWheelDescription: "${afterResetDesc}"`);
    console.log(`  wheelA buttons: ${afterResetWheelA}`);
    
    // Check if things are wrong
    if (afterResetWheelA !== initialWheelA) {
        console.log(`\nBUG FOUND: wheelA button count: ${afterResetWheelA} (expected ${initialWheelA})`);
    } else {
        console.log(`\nwheelA button count OK: ${afterResetWheelA}`);
    }
    
    if (afterResetBeatScheme !== initialBeatSchemeSummary) {
        console.log(`BUG FOUND: beatSchemeSummary: "${afterResetBeatScheme}" (expected "${initialBeatSchemeSummary}")`);
    } else {
        console.log(`beatSchemeSummary OK: "${afterResetBeatScheme}"`);
    }
    
    await browser.close();
    server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
