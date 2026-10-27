// Loads the running dev server in a real browser and reports what actually
// happens: console errors, failed requests, uncaught exceptions, and whether
// anything rendered inside #root.
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] || 'http://localhost:5173/';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') {
            consoleErrors.push(`[${m.type()}] ${m.text()}`);
        }
    });
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`));
    page.on('response', (r) => {
        if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
    });

    try {
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
    } catch (e) {
        console.log('NAVIGATION FAILED:', e.message);
    }

    await new Promise(r => setTimeout(r, 2500));

    const info = await page.evaluate(() => {
        const root = document.getElementById('root');
        const body = document.body;
        return {
            rootExists: Boolean(root),
            rootChildCount: root ? root.children.length : 0,
            rootHtmlLength: root ? root.innerHTML.length : 0,
            visibleText: (body.innerText || '').trim().slice(0, 400),
            bodyBg: getComputedStyle(body).backgroundColor,
            bodyColor: getComputedStyle(body).color,
            htmlClass: document.documentElement.className,
            bgToken: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
            fgToken: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(),
            // Anything covering the viewport?
            overlays: [...document.querySelectorAll('*')]
                .filter(el => {
                    const s = getComputedStyle(el);
                    if (s.position !== 'fixed') return false;
                    const r = el.getBoundingClientRect();
                    return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9
                        && s.opacity !== '0' && s.display !== 'none' && s.visibility !== 'hidden';
                })
                .slice(0, 5)
                .map(el => ({
                    tag: el.tagName,
                    cls: (el.className || '').toString().slice(0, 80),
                    z: getComputedStyle(el).zIndex,
                    bg: getComputedStyle(el).backgroundColor,
                })),
        };
    });

    console.log('=== PAGE STATE ===');
    console.log('#root children     :', info.rootChildCount);
    console.log('#root html length  :', info.rootHtmlLength);
    console.log('html class         :', JSON.stringify(info.htmlClass));
    console.log('--bg / --fg tokens :', info.bgToken, '/', info.fgToken);
    console.log('body bg / color    :', info.bodyBg, '/', info.bodyColor);
    console.log('visible text       :', JSON.stringify(info.visibleText.slice(0, 200)));

    console.log('\n=== FULL-VIEWPORT FIXED OVERLAYS ===');
    if (!info.overlays.length) console.log('  none');
    info.overlays.forEach(o => console.log(`  <${o.tag}> z=${o.z} bg=${o.bg}\n     class="${o.cls}"`));

    console.log('\n=== UNCAUGHT PAGE ERRORS ===');
    console.log(pageErrors.length ? pageErrors.map(e => '  ' + e).join('\n') : '  none');

    console.log('\n=== CONSOLE ERRORS/WARNINGS ===');
    console.log(consoleErrors.length ? consoleErrors.slice(0, 12).map(e => '  ' + e).join('\n') : '  none');

    console.log('\n=== FAILED REQUESTS ===');
    console.log(failedRequests.length ? [...new Set(failedRequests)].slice(0, 12).map(e => '  ' + e).join('\n') : '  none');

    await page.screenshot({ path: process.env.SHOT || 'probe.png', fullPage: false });
    console.log('\nscreenshot saved:', process.env.SHOT || 'probe.png');

    await browser.close();
})();
