/**
 * Route smoke test.
 *
 * Loads every route in a real browser, signed in as each role, in both themes,
 * and fails on any uncaught exception, console error, or empty render.
 *
 * A passing `vite build` does NOT prove the app runs: an undefined identifier
 * in JSX is a runtime ReferenceError that the bundler happily emits. This
 * catches that class of bug.
 *
 *   node scripts/smoke.cjs [baseUrl]
 *
 * Requires the dev server and API to be running.
 */
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const API = process.env.API_URL || 'http://localhost:5000/api/v1';

const ACCOUNTS = {
    guest: null,
    customer: { email: 'ali@example.com', password: 'password123' },
    provider: { email: 'umar_provider@example.com', password: 'password123' },
    superadmin: { email: 'superadmin@smartevents.com', password: 'password123' },
};

const ROUTES = {
    guest: ['/', '/home', '/events', '/vendors', '/how-it-works', '/pricing', '/about',
            '/contact', '/inspiration', '/login', '/signup', '/forgot-password', '/no-such-page'],
    customer: ['/', '/dashboard', '/bookings', '/events', '/vendors', '/tickets',
               '/favorites', '/notifications', '/settings', '/budget-tracker', '/ai-concierge'],
    provider: ['/', '/dashboard', '/leads', '/services', '/my-events', '/revenue',
               '/calendar', '/portfolio', '/reviews', '/staff/scanner', '/settings', '/ai-concierge'],
    superadmin: ['/', '/dashboard', '/admin/users', '/revenue', '/settings'],
};

// Noise that is not an application fault.
const IGNORE = [
    /Download the React DevTools/i,
    /React Router Future Flag/i,
    /favicon/i,
    /net::ERR_INTERNET_DISCONNECTED/i,
    /Failed to load resource.*fonts\.googleapis/i,
    /placehold\.co/i,
];

const results = [];

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    for (const [role, creds] of Object.entries(ACCOUNTS)) {
        // Obtain a token via the API and seed it into localStorage, so each
        // role's routes render exactly as they would for a signed-in user.
        let session = null;
        if (creds) {
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds),
            });
            const body = await res.json();
            if (!body.token) {
                console.log(`\n  cannot sign in as ${role} (${creds.email}) — run: npm run seed --prefix server`);
                continue;
            }
            session = body;
        }

        for (const theme of ['light', 'dark']) {
            for (const route of ROUTES[role]) {
                const page = await browser.newPage();
                const errors = [];

                page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
                page.on('console', (m) => {
                    if (m.type() !== 'error') return;
                    const text = m.text();
                    if (IGNORE.some(rx => rx.test(text))) return;
                    errors.push(`console: ${text.slice(0, 160)}`);
                });

                // Seed auth + theme before any app code runs.
                await page.evaluateOnNewDocument((s, t) => {
                    localStorage.setItem('theme', t);
                    if (s) {
                        localStorage.setItem('token', s.token);
                        if (s.refreshToken) localStorage.setItem('refreshToken', s.refreshToken);
                        localStorage.setItem('user', JSON.stringify(s.user));
                    }
                }, session, theme);

                try {
                    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 40000 });
                    await new Promise(r => setTimeout(r, 900));
                } catch (e) {
                    errors.push(`navigation: ${e.message}`);
                }

                const state = await page.evaluate(() => {
                    const root = document.getElementById('root');
                    const text = (document.body.innerText || '').trim();
                    return {
                        htmlLen: root ? root.innerHTML.length : 0,
                        textLen: text.length,
                        crashed: text.includes('SYSTEM INTEGRITY BREACH') || text.includes('Something went wrong'),
                        firstText: text.slice(0, 60).replace(/\s+/g, ' '),
                    };
                }).catch(() => ({ htmlLen: 0, textLen: 0, crashed: true, firstText: '' }));

                if (state.htmlLen < 200) errors.push('rendered almost nothing (blank page)');
                if (state.crashed) errors.push('error boundary caught a fault');

                results.push({ role, theme, route, errors, state });
                await page.close();
            }
        }
    }

    await browser.close();

    // ---- report ----
    const failed = results.filter(r => r.errors.length);
    const byRole = {};
    for (const r of results) {
        byRole[r.role] = byRole[r.role] || { pass: 0, fail: 0 };
        r.errors.length ? byRole[r.role].fail++ : byRole[r.role].pass++;
    }

    console.log('\n=== ROUTE SMOKE TEST ===\n');
    for (const [role, c] of Object.entries(byRole)) {
        console.log(`  ${role.padEnd(11)} ${c.pass} passed, ${c.fail} failed`);
    }

    if (failed.length) {
        console.log('\n=== FAILURES ===');
        for (const f of failed) {
            console.log(`\n  ${f.role} · ${f.theme} · ${f.route}`);
            [...new Set(f.errors)].forEach(e => console.log(`     ${e}`));
        }
    }

    console.log(`\n${results.length - failed.length}/${results.length} route renders clean\n`);
    process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('smoke test could not run:', e.message); process.exit(1); });
