const { api, makeUser, auth, PASSWORD } = require('../helpers');
const jwt = require('jsonwebtoken');

const ORIGIN = 'http://localhost:5173';

const cookieLogin = async (email) => {
    const res = await api().post('/api/v1/auth/login').set('X-Auth-Mode', 'cookie').send({ email, password: PASSWORD });
    const setCookie = res.headers['set-cookie'] || [];
    const pick = (name) => setCookie.find(c => c.startsWith(`${name}=`));
    const val = (name) => pick(name)?.split(';')[0].split('=').slice(1).join('=');
    return { res, setCookie, pick, access: val('access_token'), refresh: val('refresh_token') };
};

describe('Cookie sessions', () => {
    test('login in browser mode sets httpOnly cookies and keeps tokens out of the body', async () => {
        const u = await makeUser('customer');
        const { res, pick } = await cookieLogin(u.email);
        expect(res.status).toBe(200);
        expect(res.body.token).toBeUndefined();
        expect(res.body.refreshToken).toBeUndefined();
        expect(res.body.user.email).toBe(u.email);
        expect(pick('access_token')).toMatch(/HttpOnly/i);
        expect(pick('access_token')).toMatch(/SameSite=Lax/i);
        expect(pick('access_token')).toMatch(/Path=\/(;|$)/);
        expect(pick('refresh_token')).toMatch(/HttpOnly/i);
        expect(pick('refresh_token')).toMatch(/Path=\/api\/v1\/auth/);
    });

    test('other clients still receive tokens in the body', async () => {
        const u = await makeUser('customer');
        const res = await api().post('/api/v1/auth/login').send({ email: u.email, password: PASSWORD });
        expect(res.body.token).toBeTruthy();
        expect(res.body.refreshToken).toBeTruthy();
    });

    test('the access cookie authenticates requests', async () => {
        const u = await makeUser('customer');
        const { access } = await cookieLogin(u.email);
        const res = await api().get('/api/v1/auth/me').set('Cookie', `access_token=${access}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(u.email);
    });

    test('state-changing cookie requests need a trusted origin (CSRF)', async () => {
        const u = await makeUser('customer');
        const { access } = await cookieLogin(u.email);
        const send = () => api().put('/api/v1/auth/profile').set('Cookie', `access_token=${access}`);

        // No Origin and no Referer: refused by the CSRF guard.
        const none = await send().send({ name: 'No Origin' });
        expect(none.status).toBe(403);
        expect(none.body.code).toBe('CSRF_BLOCKED');
        // A foreign Referer (no Origin header) is refused by the CSRF guard too.
        const referer = await send().set('Referer', 'https://evil.example/page').send({ name: 'Evil Referer' });
        expect(referer.status).toBe(403);
        expect(referer.body.code).toBe('CSRF_BLOCKED');
        // A foreign Origin is refused outright by CORS.
        expect((await send().set('Origin', 'https://evil.example').send({ name: 'Evil Origin' })).status).toBe(403);
        const ok = await send().set('Origin', ORIGIN).send({ name: 'Good Origin' });
        expect(ok.status).toBe(200);
    });

    test('header-token requests need no Origin header (scripts, API clients)', async () => {
        const u = await makeUser('customer');
        const res = await api().put('/api/v1/auth/profile').set(auth(u.token)).send({ name: 'Header Auth' });
        expect(res.status).toBe(200);
    });

    test('the refresh cookie renews the session, but only from a trusted origin', async () => {
        const u = await makeUser('customer');
        const { refresh } = await cookieLogin(u.email);
        const blocked = await api().post('/api/v1/auth/refresh').set('X-Auth-Mode', 'cookie').set('Cookie', `refresh_token=${refresh}`).send({});
        expect(blocked.status).toBe(403);
        const ok = await api().post('/api/v1/auth/refresh').set('X-Auth-Mode', 'cookie').set('Origin', ORIGIN).set('Cookie', `refresh_token=${refresh}`).send({});
        expect(ok.status).toBe(200);
        expect(ok.body.token).toBeUndefined();
        expect((ok.headers['set-cookie'] || []).some(c => c.startsWith('access_token='))).toBe(true);
    });

    test('an access token cannot be used as the refresh cookie', async () => {
        const u = await makeUser('customer');
        const { access } = await cookieLogin(u.email);
        const res = await api().post('/api/v1/auth/refresh').set('Origin', ORIGIN).set('Cookie', `refresh_token=${access}`).send({});
        expect(res.status).toBe(401);
    });

    test('logout clears both cookies', async () => {
        const u = await makeUser('customer');
        const res = await api().post('/api/v1/auth/logout').set('Origin', ORIGIN);
        const cleared = res.headers['set-cookie'] || [];
        expect(cleared.some(c => c.startsWith('access_token=;'))).toBe(true);
        expect(cleared.some(c => c.startsWith('refresh_token=;'))).toBe(true);
        expect(u).toBeTruthy();
    });

    test('a banned user is locked out even with a valid cookie', async () => {
        const u = await makeUser('customer');
        const admin = await makeUser('admin');
        const { access } = await cookieLogin(u.email);
        await api().put(`/api/v1/admin/users/${u.id}/ban`).set(auth(admin.token)).send({ status: 'banned' });
        const res = await api().get('/api/v1/auth/me').set('Cookie', `access_token=${access}`);
        expect(res.status).toBe(403);
    });
});

describe('Socket tokens', () => {
    test('a signed-in user can fetch a short-lived socket token that is useless for the API', async () => {
        const u = await makeUser('customer');
        const res = await api().get('/api/v1/auth/socket-token').set(auth(u.token));
        expect(res.status).toBe(200);
        const decoded = jwt.decode(res.body.socketToken);
        expect(decoded.typ).toBe('socket');
        expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(120);
        expect((await api().get('/api/v1/auth/me').set(auth(res.body.socketToken))).status).toBe(401);
    });

    test('anonymous users cannot get a socket token', async () => {
        expect((await api().get('/api/v1/auth/socket-token')).status).toBe(401);
    });
});
