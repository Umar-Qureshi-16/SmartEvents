// Must be set before the app (and config/env.js) is loaded.
process.env.ADMIN_SIGNUP_CODE = 'test-admin-code-123';

const { api, makeUser, auth, PASSWORD } = require('../helpers');
const User = require('../../models/User');
const VendorProfile = require('../../models/VendorProfile');

const register = (body) =>
    api().post('/api/v1/auth/register').send({ password: PASSWORD, ...body });

describe('Signup roles', () => {
    test('customer and provider can sign up; provider keeps the chosen category', async () => {
        expect((await register({ name: 'Cust One', email: 'c1@test.com', role: 'customer' })).status).toBe(201);
        expect((await register({ name: 'Vend One', email: 'v1@test.com', role: 'provider', category: 'venue' })).status).toBe(201);

        const vendor = await User.findOne({ email: 'v1@test.com' });
        const profile = await VendorProfile.findOne({ userId: vendor._id });
        expect(profile.category).toBe('venue');
    });

    test('admin signup is refused without the code and with a wrong code', async () => {
        const base = { name: 'Bad Admin', email: 'a0@test.com', role: 'admin' };
        expect((await register(base)).status).toBe(403);
        expect((await register({ ...base, adminCode: 'wrong' })).status).toBe(403);
        expect(await User.findOne({ email: 'a0@test.com' })).toBeNull();
    });

    test('admin and superadmin signup succeed with the correct code', async () => {
        const code = process.env.ADMIN_SIGNUP_CODE;
        expect((await register({ name: 'Good Admin', email: 'a1@test.com', role: 'admin', adminCode: code })).status).toBe(201);
        expect((await register({ name: 'Super One', email: 's1@test.com', role: 'superadmin', adminCode: code })).status).toBe(201);
        expect((await User.findOne({ email: 'a1@test.com' })).role).toBe('admin');
        expect((await User.findOne({ email: 's1@test.com' })).role).toBe('superadmin');
    });
});

describe('Token types', () => {
    test('a refresh token is rejected as an access token', async () => {
        const u = await makeUser('customer');
        expect((await api().get('/api/v1/auth/me').set(auth(u.token))).status).toBe(200);
        expect((await api().get('/api/v1/auth/me').set(auth(u.refreshToken))).status).toBe(401);
    });

    test('refresh accepts only refresh tokens', async () => {
        const u = await makeUser('customer');
        const ok = await api().post('/api/v1/auth/refresh').send({ refreshToken: u.refreshToken });
        expect(ok.status).toBe(200);
        expect(ok.body.token).toBeTruthy();
        const bad = await api().post('/api/v1/auth/refresh').send({ refreshToken: u.token });
        expect(bad.status).toBe(401);
    });
});

describe('Admin-tier protection', () => {
    test('an admin cannot demote, ban or promote admin-level accounts', async () => {
        const admin = await makeUser('admin');
        const other = await makeUser('admin');
        const sup = await makeUser('superadmin');
        const cust = await makeUser('customer');
        const role = (id, r, token) => api().put(`/api/v1/admin/users/${id}/role`).set(auth(token)).send({ role: r });

        expect((await role(sup.id, 'customer', admin.token)).status).toBe(403);
        expect((await role(other.id, 'customer', admin.token)).status).toBe(403);
        expect((await role(cust.id, 'admin', admin.token)).status).toBe(403);
        expect((await api().put(`/api/v1/admin/users/${sup.id}/ban`).set(auth(admin.token)).send({ status: 'banned' })).status).toBe(403);
        expect((await User.findById(sup.id)).role).toBe('superadmin');
    });

    test('nobody can change their own role; a superadmin can change an admin', async () => {
        const admin = await makeUser('admin');
        const sup = await makeUser('superadmin');
        const self = await api().put(`/api/v1/admin/users/${admin.id}/role`).set(auth(admin.token)).send({ role: 'customer' });
        expect([400, 403]).toContain(self.status);
        const ok = await api().put(`/api/v1/admin/users/${admin.id}/role`).set(auth(sup.token)).send({ role: 'customer' });
        expect(ok.status).toBe(200);
    });
});

describe('Immediate revocation', () => {
    test('a banned user is locked out at once, including refresh', async () => {
        const admin = await makeUser('admin');
        const cust = await makeUser('customer');
        const ban = await api().put(`/api/v1/admin/users/${cust.id}/ban`).set(auth(admin.token)).send({ status: 'banned' });
        expect(ban.status).toBe(200);
        expect((await api().get('/api/v1/auth/me').set(auth(cust.token))).status).toBe(403);
        expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: cust.refreshToken })).status).toBe(403);
    });

    test('a demoted admin loses admin routes at once', async () => {
        const admin = await makeUser('admin');
        const sup = await makeUser('superadmin');
        expect((await api().get('/api/v1/admin/stats').set(auth(admin.token))).status).toBe(200);
        await api().put(`/api/v1/admin/users/${admin.id}/role`).set(auth(sup.token)).send({ role: 'customer' });
        expect((await api().get('/api/v1/admin/stats').set(auth(admin.token))).status).toBe(403);
    });
});
