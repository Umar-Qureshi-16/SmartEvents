#!/usr/bin/env node
/**
 * Full-system acceptance run.
 *
 * Exercises every user-facing feature against a running server and a real
 * database, in the order a demo would follow. Unlike the Jest suite (which
 * isolates units), this walks the complete journeys end to end and is the
 * script to run before a submission or a viva.
 *
 *   Terminal 1:  npm run dev --prefix server
 *   Terminal 2:  npm run test:e2e --prefix server
 *
 * Override the target with BASE_URL.
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:5000') + '/api/v1';

let passed = 0, failed = 0;
const failures = [];
let section = '';

const head = (t) => { section = t; console.log(`\n[1m${t}[0m`); };
const ok = (cond, msg) => {
    if (cond) { passed++; console.log(`  [32mPASS[0m  ${msg}`); }
    else { failed++; failures.push(`${section} :: ${msg}`); console.log(`  [31mFAIL[0m  ${msg}`); }
};

const call = (method) => async (path, body, token) => {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    let parsed = null;
    try { parsed = await res.json(); } catch { /* empty body */ }
    return { status: res.status, body: parsed };
};
const GET = (p, t) => call('GET')(p, null, t);
const POST = call('POST');
const PUT = call('PUT');
const DELETE = (p, t) => call('DELETE')(p, null, t);

const PW = 'password123';
const stamp = Date.now();

(async () => {
    console.log(`\nSmartEvents acceptance run against ${BASE}\n${'='.repeat(60)}`);

    // ---------------------------------------------------------------- health
    head('System health');
    let r = await GET('/health');
    ok(r.status === 200, `health probe responds (${r.body?.data?.status})`);
    ok(r.body?.data?.database === 'connected', 'database is connected');

    r = await GET('/nope');
    ok(r.status === 404, 'unknown API route returns 404');

    // ------------------------------------------------------------------ auth
    head('Authentication and account security');
    const custEmail = `e2e-cust-${stamp}@test.com`;
    const provEmail = `e2e-prov-${stamp}@test.com`;

    r = await POST('/auth/register', { name: 'E2E Customer', email: custEmail, password: PW, role: 'customer' });
    ok(r.status === 201, 'customer can register');

    r = await POST('/auth/register', { name: 'E2E Provider', email: provEmail, password: PW, role: 'provider' });
    ok(r.status === 201, 'provider can register');

    r = await POST('/auth/register', { name: 'Bad', email: `evil-${stamp}@test.com`, password: PW, role: 'superadmin' });
    ok(r.status === 400, 'public signup cannot create a superadmin');

    r = await POST('/auth/register', { name: 'A', email: 'not-an-email', password: 'x' });
    ok(r.status === 400 && Array.isArray(r.body?.errors), 'invalid input returns 400 with field errors');

    const unknown = await POST('/auth/login', { email: `ghost-${stamp}@test.com`, password: PW });
    const wrongPw = await POST('/auth/login', { email: custEmail, password: 'wrongpassword' });
    ok(unknown.body?.message === wrongPw.body?.message, 'login cannot be used to enumerate accounts');

    const cust = (await POST('/auth/login', { email: custEmail, password: PW })).body;
    const prov = (await POST('/auth/login', { email: provEmail, password: PW })).body;
    ok(Boolean(cust?.token && prov?.token), 'login issues access tokens');

    r = await GET('/auth/me', 'garbage.token');
    ok(r.status === 401, 'invalid token returns 401 so the refresh flow can fire');

    r = await POST('/auth/refresh', { refreshToken: cust.refreshToken });
    ok(r.status === 200 && r.body?.token, 'refresh token exchanges for a new access token');

    r = await POST('/auth/forgot-password', { email: custEmail });
    ok(r.status === 200 && !r.body?.token, 'password reset never returns the token in the response');

    // Seeded accounts the demo relies on.
    const seeded = {};
    for (const [role, email] of [
        ['superadmin', 'superadmin@smartevents.com'],
        ['admin', 'admin@smartevents.com'],
        ['provider', 'umar_provider@example.com'],
        ['customer', 'ali@example.com'],
    ]) {
        const res = await POST('/auth/login', { email, password: PW });
        seeded[role] = res.body?.token;
        ok(res.status === 200, `seeded ${role} account signs in (${email})`);
    }

    // ------------------------------------------------------------ marketplace
    head('Marketplace browsing');
    r = await GET('/events');
    ok(r.status === 200 && Array.isArray(r.body?.events), `event listing returns real records (${r.body?.meta?.total} total)`);
    ok(r.body.events.every(e => e._id && e.title), 'events carry database identifiers, not fabricated ones');

    r = await GET('/events?category=Wedding');
    ok(r.body.events.every(e => e.category === 'Wedding'), 'category filter matches the schema enum');

    r = await GET('/events?sortBy=price_asc');
    const prices = r.body.events.map(e => e.price);
    ok(prices.every((v, i) => i === 0 || prices[i - 1] <= v), 'price sorting works');

    r = await GET('/vendor/list');
    ok(r.status === 200 && r.body?.data?.length > 0, `vendor directory returns real providers (${r.body?.data?.length})`);
    ok(r.body.data.every(v => v.businessName && v.category), 'vendors carry real profile data');

    r = await GET('/vendor/list?category=catering');
    ok(r.body.data.every(v => v.category === 'catering'), 'vendor category filter works');

    // ------------------------------------------------------- provider listing
    head('Provider event management');
    r = await POST('/events', {
        title: 'E2E Acceptance Gala', category: 'Corporate', price: 6000, location: 'Lahore',
        description: 'An event created by the acceptance run to verify provider CRUD.',
        capacity: 200, date: new Date(Date.now() + 40 * 86400000).toISOString(),
    }, prov.token);
    ok(r.status === 201, 'provider can publish an event');
    const eventId = r.body?.data?._id;

    r = await POST('/events', {
        title: 'No Date Event', category: 'Corporate', price: 100, location: 'Lahore',
        description: 'Missing the required date field entirely.',
    }, prov.token);
    ok(r.status === 400, 'a missing required field returns 400, not an opaque 500');

    r = await POST('/events', {
        title: 'Customer Attempt', category: 'Corporate', price: 100, location: 'Lahore',
        description: 'A customer should not be able to publish an event.',
        date: new Date(Date.now() + 86400000).toISOString(),
    }, cust.token);
    ok(r.status === 403, 'a customer cannot publish an event');

    r = await PUT(`/events/${eventId}`, {
        title: 'E2E Acceptance Gala (edited)', category: 'Corporate', price: 6500, location: 'Lahore',
        description: 'Edited by the acceptance run to verify update permissions.',
        capacity: 220, date: new Date(Date.now() + 40 * 86400000).toISOString(),
    }, prov.token);
    ok(r.status === 200 && r.body?.data?.price === 6500, 'provider can edit their own event');

    r = await GET('/events/organizer/my-events', prov.token);
    ok(r.body?.data?.some(e => e._id === eventId), 'the event appears in the provider listing');

    // -------------------------------------------------------- negotiation
    head('Negotiation engine (flagship)');
    r = await POST('/bookings', { eventId, offerPrice: 4000, message: 'Could you do 4000 on a weekday?' }, cust.token);
    ok(r.status === 201, 'customer makes an opening offer');
    const bookingId = r.body?.data?._id;
    ok(r.body?.data?.negotiationHistory?.[0]?.message === 'Could you do 4000 on a weekday?',
        'the note is stored on the opening offer');
    ok(r.body?.data?.negotiationHistory?.[0]?.action === 'offer', 'the opening offer is tagged correctly');

    r = await POST('/bookings', { offerPrice: 100 }, cust.token);
    ok(r.status === 400, 'a booking with no target is rejected');

    r = await POST('/bookings', { eventId, offerPrice: 0 }, cust.token);
    ok(r.status === 400, 'a zero offer is rejected');

    r = await POST(`/bookings/${bookingId}/negotiate`, { price: 5200, message: 'Best I can do is 5200.' }, prov.token);
    ok(r.status === 200 && r.body?.data?.status === 'negotiating', 'provider counters the offer');
    ok(r.body?.data?.negotiationHistory?.at(-1)?.message === 'Best I can do is 5200.', 'the counter note is preserved');
    ok(r.body?.data?.lastPrice === 4000 && r.body?.data?.offerPrice === 5200, 'the price delta is tracked');

    r = await POST(`/bookings/${bookingId}/negotiate`, { price: 4800, message: 'Meet in the middle at 4800?' }, cust.token);
    ok(r.body?.data?.negotiationHistory?.length === 3, 'the history is append-only across rounds');

    const outsiderEmail = `e2e-outsider-${stamp}@test.com`;
    await POST('/auth/register', { name: 'Outsider', email: outsiderEmail, password: PW, role: 'customer' });
    const outsider = (await POST('/auth/login', { email: outsiderEmail, password: PW })).body;
    r = await GET(`/bookings/${bookingId}`, outsider.token);
    ok(r.status === 403, 'a third party cannot read the negotiation (403, not 500)');

    r = await PUT(`/bookings/${bookingId}/accept`, {}, prov.token);
    ok(r.status === 200 && r.body?.data?.status === 'confirmed', 'the offer is accepted and the booking confirmed');

    r = await POST(`/bookings/${bookingId}/negotiate`, { price: 3000 }, cust.token);
    ok(r.status === 409, 'a settled booking refuses further counter-offers');

    // ------------------------------------------------------------- disputes
    head('Dispute and mediation');
    r = await POST(`/bookings/${bookingId}/dispute`, { reason: 'short' }, cust.token);
    ok(r.status === 400, 'a dispute needs a substantive reason');

    r = await POST(`/bookings/${bookingId}/dispute`, { reason: 'The provider did not arrive at the agreed venue.' }, cust.token);
    ok(r.status === 200 && r.body?.data?.status === 'disputed', 'a party can escalate a confirmed booking');

    r = await POST(`/bookings/${bookingId}/dispute`, { reason: 'I want to interfere with this booking.' }, outsider.token);
    ok(r.status === 403, 'an outsider cannot raise a dispute');

    r = await GET('/super-admin/disputes', seeded.superadmin);
    ok(r.body?.data?.some(d => d._id === bookingId), 'the dispute reaches the mediation queue');

    r = await PUT(`/admin/bookings/${bookingId}/resolve-dispute`, { resolution: 'released_vendor' }, seeded.admin);
    ok(r.status === 200 && r.body?.data?.status === 'completed', 'an admin can rule on the dispute');

    r = await PUT(`/admin/bookings/${bookingId}/resolve-dispute`, { resolution: 'released_vendor' }, seeded.admin);
    ok(r.status === 400, 'a settled dispute cannot be resolved twice');

    // ------------------------------------------------------------- ticketing
    head('Ticketing and gate check-in');
    r = await POST('/tickets/purchase', { eventId, ticketType: 'VIP', price: 6500 }, cust.token);
    ok(r.status === 201, 'a customer can buy an entry pass');
    const ticketNumber = r.body?.data?.ticketNumber;
    ok((r.body?.data?.qrCode || '').startsWith('data:image/png;base64,'),
        'the QR is rendered server-side, with no third-party service');

    r = await GET('/tickets/my', cust.token);
    ok(r.body?.data?.some(t => t.ticketNumber === ticketNumber), 'the pass appears in the wallet');
    ok(r.body.data.every(t => !t.qrCode || t.qrCode.startsWith('data:image')), 'every wallet pass carries a rendered QR');

    r = await POST('/tickets/scan', { ticketNumber }, prov.token);
    ok(r.status === 200, 'the gate accepts a valid pass');

    r = await POST('/tickets/scan', { ticketNumber }, prov.token);
    ok(r.status === 400, 'a duplicate scan is rejected');

    r = await POST('/tickets/scan', { ticketNumber: 'TKT-DOES-NOT-EXIST' }, prov.token);
    ok(r.status === 404, 'an unknown pass is rejected');

    // ------------------------------------------------------------------- AI
    head('AI concierge');
    r = await POST('/ai/query', { query: 'How is my business performing?' }, seeded.provider);
    const providerReply = r.body?.data?.reply || '';
    ok(r.status === 200 && providerReply.length > 50, `provider gets a substantive reply (${providerReply.length} chars)`);

    r = await POST('/ai/query', { query: 'Help me plan a wedding for 100 guests' }, seeded.customer);
    const custReply = (r.body?.data?.reply || '').toLowerCase();
    ok(!custReply.includes('your business'), 'a customer is not addressed as a business');
    ok(!custReply.includes('[action_event_create]'), 'a customer is not offered provider-only actions');

    r = await POST('/ai/timeline', {
        eventDetails: { date: new Date(Date.now() + 60 * 86400000).toISOString(), eventType: 'Wedding', title: 'E2E Wedding' },
    }, seeded.customer);
    ok(Array.isArray(r.body?.data), 'the timeline returns an ARRAY the UI can map over');
    if (Array.isArray(r.body?.data) && r.body.data.length) {
        const days = r.body.data.map(m => m.daysBefore);
        ok(days.every((v, i) => i === 0 || days[i - 1] >= v), 'milestones are ordered by lead time');
        ok(r.body.data.every(m => m.milestone && m.description !== undefined), 'each milestone has the fields the UI reads');
    }

    r = await POST('/ai/rfp', { query: 'Corporate gala for 200 guests in Lahore' }, seeded.customer);
    ok(r.status === 200 && r.body?.data?.title, 'the RFP generator returns a structured plan');

    r = await POST('/ai/budget/analyze', { totalBudget: 500000, services: [{ name: 'Catering', cost: 200000 }] }, seeded.customer);
    ok(r.status === 200 && r.body?.data?.breakdown, 'the budget analyser returns a breakdown');

    // -------------------------------------------------------------- reviews
    head('Reviews');
    r = await POST('/reviews', { eventId, rating: 5, comment: 'Outstanding service throughout.' }, outsider.token);
    ok(r.status === 403, 'a review requires a confirmed booking');

    // --------------------------------------------------------- governance
    head('Governance and access control');
    for (const path of ['/admin/users', '/admin/stats', '/admin/audit-logs']) {
        r = await GET(path, cust.token);
        ok(r.status === 403, `a customer is denied ${path}`);
    }
    for (const path of ['/super-admin/stats', '/super-admin/fraud-risks', '/super-admin/providers']) {
        r = await GET(path, seeded.admin);
        ok(r.status === 403, `an ordinary admin is denied ${path}`);
    }

    r = await GET('/super-admin/stats', seeded.superadmin);
    ok(r.status === 200 && typeof r.body?.data?.totalUsers === 'number', 'superadmin sees platform statistics');

    r = await GET('/super-admin/revenue-series', seeded.superadmin);
    ok(r.body?.data?.length === 6, 'the revenue series returns a continuous six-month window');

    r = await GET('/super-admin/fraud-risks', seeded.superadmin);
    const scores = (r.body?.data || []).map(x => x.score);
    ok(scores.every((v, i) => i === 0 || scores[i - 1] >= v), 'fraud risks are ordered by score');

    r = await GET('/super-admin/providers', seeded.superadmin);
    const targetProvider = r.body?.data?.find(p => p.email === provEmail);
    ok(Boolean(targetProvider), 'the provider roster lists registered providers');

    r = await POST('/super-admin/user-governance', { userId: targetProvider._id, action: 'restrict' }, seeded.superadmin);
    ok(r.status === 200 && r.body?.data?.status === 'restricted', 'a superadmin can restrict an account');

    r = await GET('/super-admin/logs', seeded.superadmin);
    ok(r.body?.data?.some(l => l.action === 'USER_RESTRICT'), 'the action is recorded in the audit ledger');

    r = await POST('/super-admin/user-governance', { userId: targetProvider._id, action: 'reinstate' }, seeded.superadmin);
    ok(r.body?.data?.status === 'active', 'the account can be reinstated');

    r = await PUT(`/admin/users/${outsider.user.id}/role`, { role: 'provider' }, seeded.superadmin);
    ok(r.status === 200 && r.body?.data?.role === 'provider', 'an admin can change a user role');

    r = await PUT(`/admin/users/${outsider.user.id}/role`, { role: 'superadmin' }, seeded.admin);
    ok(r.status === 400, 'an ordinary admin cannot grant superadmin');

    // ---------------------------------------------------------- dashboards
    head('Dashboards');
    r = await GET('/bookings/organizer/dashboard', seeded.provider);
    ok(r.status === 200 && typeof r.body?.data?.analytics?.totalEarnings === 'number',
        `provider earnings compute ($${r.body?.data?.analytics?.totalEarnings})`);

    r = await GET('/bookings/my', seeded.customer);
    ok(r.status === 200 && Array.isArray(r.body?.data), `customer bookings load (${r.body?.data?.length})`);

    r = await GET('/notifications', seeded.customer);
    ok(r.status === 200, 'the notification inbox loads');

    // -------------------------------------------------------------- cleanup
    head('Cleanup');
    r = await DELETE(`/events/${eventId}`, prov.token);
    ok(r.status === 200, 'the provider can delete their event');

    // --------------------------------------------------------------- report
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[1m${passed} passed, ${failed} failed[0m`);
    if (failures.length) {
        console.log('\n[31mFailures:[0m');
        failures.forEach(f => console.log(`  - ${f}`));
    }
    console.log('');
    process.exit(failed ? 1 : 0);
})().catch(err => {
    console.error('\n[31mAcceptance run could not complete:[0m', err.message);
    console.error('Is the server running? Start it with: npm run dev --prefix server');
    process.exit(1);
});
