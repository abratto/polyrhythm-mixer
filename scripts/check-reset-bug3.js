const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve('/home/runner/work/polyrhythm-mixer/polyrhythm-mixer');
const PORT = 9997;
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
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    
    // Capture initial state
    const initial = await page.evaluate(() => ({
        wheelABtns: document.querySelectorAll('#meterAWheelGrid .step-btn').length,
        wheelBBtns: document.querySelectorAll('#meterBWheelGrid .step-btn').length,
        wheelAActive: document.querySelectorAll('#meterAWheelGrid .step-btn.active').length,
        wheelBActive: document.querySelectorAll('#meterBWheelGrid .step-btn.active').length,
        titleA: document.getElementById('titleAWheel').textContent,
        titleB: document.getElementById('titleBWheel').textContent,
        beatSchemeSummary: document.getElementById('beatSchemeSummary').textContent,
        descA: document.getElementById('aWheelDescription').textContent,
        descB: document.getElementById('bWheelDescription').textContent,
    }));
    
    console.log('Initial state:', JSON.stringify(initial, null, 2));
    
    // Change to 7 against 4
    await page.selectOption('#rhythmA', '7');
    await page.locator('#rhythmA').dispatchEvent('change');
    await page.waitForTimeout(300);
    
    const after7 = await page.evaluate(() => ({
        wheelABtns: document.querySelectorAll('#meterAWheelGrid .step-btn').length,
        wheelBBtns: document.querySelectorAll('#meterBWheelGrid .step-btn').length,
        wheelAActive: document.querySelectorAll('#meterAWheelGrid .step-btn.active').length,
        wheelBActive: document.querySelectorAll('#meterBWheelGrid .step-btn.active').length,
        titleA: document.getElementById('titleAWheel').textContent,
        titleB: document.getElementById('titleBWheel').textContent,
        beatSchemeSummary: document.getElementById('beatSchemeSummary').textContent,
        descA: document.getElementById('aWheelDescription').textContent,
    }));
    
    console.log('\nAfter 7 against 4:', JSON.stringify(after7, null, 2));
    
    // Reset
    await page.locator('#resetBtn').click();
    await page.waitForFunction(() => document.querySelector('#rhythmA')?.value === '6');
    await page.waitForTimeout(300);
    
    const afterReset = await page.evaluate(() => ({
        wheelABtns: document.querySelectorAll('#meterAWheelGrid .step-btn').length,
        wheelBBtns: document.querySelectorAll('#meterBWheelGrid .step-btn').length,
        wheelAActive: document.querySelectorAll('#meterAWheelGrid .step-btn.active').length,
        wheelBActive: document.querySelectorAll('#meterBWheelGrid .step-btn.active').length,
        titleA: document.getElementById('titleAWheel').textContent,
        titleB: document.getElementById('titleBWheel').textContent,
        beatSchemeSummary: document.getElementById('beatSchemeSummary').textContent,
        descA: document.getElementById('aWheelDescription').textContent,
    }));
    
    console.log('\nAfter Reset:', JSON.stringify(afterReset, null, 2));
    
    // Compare initial vs after reset
    console.log('\n=== Comparison ===');
    let allMatch = true;
    for (const key of Object.keys(initial)) {
        if (initial[key] !== afterReset[key]) {
            console.log(`MISMATCH ${key}: initial="${initial[key]}" vs afterReset="${afterReset[key]}"`);
            allMatch = false;
        }
    }
    if (allMatch) {
        console.log('✓ All values match after reset!');
    }
    
    await browser.close();
    server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
