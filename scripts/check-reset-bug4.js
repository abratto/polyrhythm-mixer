const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve('/home/runner/work/polyrhythm-mixer/polyrhythm-mixer');
const PORT = 9996;
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
    
    const getState = () => page.evaluate(() => ({
        wheelABtns: document.querySelectorAll('#meterAWheelGrid .step-btn').length,
        wheelBBtns: document.querySelectorAll('#meterBWheelGrid .step-btn').length,
        wheelAActive: document.querySelectorAll('#meterAWheelGrid .step-btn.active').length,
        wheelBActive: document.querySelectorAll('#meterBWheelGrid .step-btn.active').length,
        titleA: document.getElementById('titleAWheel')?.textContent,
        titleB: document.getElementById('titleBWheel')?.textContent,
        beatSchemeSummary: document.getElementById('beatSchemeSummary')?.textContent,
        descA: document.getElementById('aWheelDescription')?.textContent,
        descB: document.getElementById('bWheelDescription')?.textContent,
        descAHidden: document.getElementById('aWheelDescription')?.hidden,
        descBHidden: document.getElementById('bWheelDescription')?.hidden,
        rhythmA: document.getElementById('rhythmA')?.value,
        rhythmB: document.getElementById('rhythmB')?.value,
    }));
    
    const initial = await getState();
    console.log('Initial state:', JSON.stringify(initial, null, 2));
    
    // Change to 7 against 4
    await page.selectOption('#rhythmA', '7');
    await page.locator('#rhythmA').dispatchEvent('change');
    await page.waitForTimeout(300);
    
    // Open the description panel
    await page.locator('#aWheelInfoBtn').click();
    await page.locator('#bWheelInfoBtn').click();
    await page.waitForTimeout(100);
    
    const after7 = await getState();
    console.log('\nAfter 7 against 4 (with descriptions visible):', JSON.stringify(after7, null, 2));
    
    // Reset
    await page.locator('#resetBtn').click();
    await page.waitForFunction(() => document.querySelector('#rhythmA')?.value === '6');
    await page.waitForTimeout(300);
    
    const afterReset = await getState();
    console.log('\nAfter Reset:', JSON.stringify(afterReset, null, 2));
    
    // Check everything
    let bugs = [];
    if (afterReset.rhythmA !== '6') bugs.push(`rhythmA wrong: "${afterReset.rhythmA}" (expected "6")`);
    if (afterReset.rhythmB !== '4') bugs.push(`rhythmB wrong: "${afterReset.rhythmB}" (expected "4")`);
    if (afterReset.beatSchemeSummary !== '— 6 against 4') bugs.push(`beatSchemeSummary wrong: "${afterReset.beatSchemeSummary}"`);
    if (afterReset.wheelABtns !== 12) bugs.push(`wheelABtns wrong: ${afterReset.wheelABtns} (expected 12)`);
    if (afterReset.wheelBBtns !== 12) bugs.push(`wheelBBtns wrong: ${afterReset.wheelBBtns} (expected 12)`);
    if (afterReset.wheelAActive !== 6) bugs.push(`wheelAActive wrong: ${afterReset.wheelAActive} (expected 6)`);
    if (afterReset.wheelBActive !== 4) bugs.push(`wheelBActive wrong: ${afterReset.wheelBActive} (expected 4)`);
    if (!afterReset.descA?.includes('6 groups')) bugs.push(`descA stale: "${afterReset.descA}"`);
    if (!afterReset.descB?.includes('4 groups')) bugs.push(`descB stale: "${afterReset.descB}"`);
    
    if (bugs.length > 0) {
        console.log('\n=== BUGS FOUND ===');
        bugs.forEach(b => console.log(` - ${b}`));
    } else {
        console.log('\n✓ All checks passed!');
    }
    
    await browser.close();
    server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
