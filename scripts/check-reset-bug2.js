const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve('/home/runner/work/polyrhythm-mixer/polyrhythm-mixer');
const PORT = 9998;
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
    
    // Show the description for Awheel by clicking the info button
    await page.locator('#aWheelInfoBtn').click();
    await page.waitForTimeout(100);
    
    // Verify description is now visible
    const descVisible = await page.locator('#aWheelDescription').evaluate(el => !el.hidden);
    console.log(`aWheelDescription visible: ${descVisible}`);
    
    // Change A from 6 to 7
    await page.selectOption('#rhythmA', '7');
    await page.locator('#rhythmA').dispatchEvent('change');
    await page.waitForTimeout(300);
    
    const afterChangeDesc = await page.locator('#aWheelDescription').textContent();
    const afterChangeBtns = await page.locator('#meterAWheelGrid .step-btn').count();
    const afterChangeSummary = await page.locator('#beatSchemeSummary').textContent();
    
    console.log(`\nAfter changing A to 7:`);
    console.log(`  beatSchemeSummary: "${afterChangeSummary}"`);
    console.log(`  aWheelDescription: "${afterChangeDesc}"`);
    console.log(`  aWheelDescription visible: ${await page.locator('#aWheelDescription').evaluate(el => !el.hidden)}`);
    console.log(`  wheelA buttons: ${afterChangeBtns}`);
    
    // Click Reset
    await page.locator('#resetBtn').click();
    await page.waitForFunction(() => document.querySelector('#rhythmA')?.value === '6');
    await page.waitForTimeout(300);
    
    const afterResetDesc = await page.locator('#aWheelDescription').textContent();
    const afterResetBtns = await page.locator('#meterAWheelGrid .step-btn').count();
    const afterResetSummary = await page.locator('#beatSchemeSummary').textContent();
    const afterResetDescVisible = await page.locator('#aWheelDescription').evaluate(el => !el.hidden);
    const afterResetRhythmA = await page.locator('#rhythmA').inputValue();
    
    console.log(`\nAfter Reset Mixer:`);
    console.log(`  beatSchemeSummary: "${afterResetSummary}"`);
    console.log(`  aWheelDescription: "${afterResetDesc}"`);
    console.log(`  aWheelDescription visible: ${afterResetDescVisible}`);
    console.log(`  wheelA buttons: ${afterResetBtns}`);
    console.log(`  rhythmA value: ${afterResetRhythmA}`);
    
    // Check specific issues
    let bugs = [];
    if (afterResetSummary !== '— 6 against 4') bugs.push(`beatSchemeSummary wrong: "${afterResetSummary}"`);
    if (afterResetBtns !== 12) bugs.push(`wheelA buttons wrong: ${afterResetBtns} (expected 12)`);
    if (!afterResetDesc.includes('6 groups')) bugs.push(`aWheelDescription stale: "${afterResetDesc}"`);
    if (afterResetRhythmA !== '6') bugs.push(`rhythmA select wrong: ${afterResetRhythmA}`);
    
    if (bugs.length > 0) {
        console.log('\n=== BUGS FOUND ===');
        bugs.forEach(b => console.log(` - ${b}`));
    } else {
        console.log('\n✓ All checks passed - no bug found');
    }
    
    await browser.close();
    server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
