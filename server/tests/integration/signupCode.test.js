process.env.ADMIN_SIGNUP_CODE = 'env-admin-code-123';

const { api, makeUser, auth, PASSWORD } = require('../helpers');
const AuditLog = require('../../models/AuditLog');
const PlatformSetting = require('../../models/PlatformSetting');

const register = (body) => api().post('/api/v1/auth/register').send({ password: PASSWORD, ...body });
const NEW_CODE = 'Console-Code-2026';

describe('Super admin can change the admin signup code', () => {
    test('status reports the environment code without revealing it', async () => {
        const sa = await makeUser('superadmin');
        const res = await api().get('/api/v1/super-admin/signup-code').set(auth(sa.token));
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ enabled: true, source: 'environment' });
        expect(JSON.stringify(res.body)).not.toContain('env-admin-code-123');
    });

    test('a new code replaces the environment code and is stored hashed', async () => {
        const sa = await makeUser('superadmin');
        const res = await api().put('/api/v1/super-admin/signup-code').set(auth(sa.token)).send({ code: NEW_CODE });
        expect(res.status).toBe(200);
        expect(res.body.data.source).toBe('console');
        expect(JSON.stringify(res.body)).not.toContain(NEW_CODE);

        const stored = await PlatformSetting.findOne({ key: 'adminSignupCodeHash' });
        expect(stored.value).not.toBe(NEW_CODE);

        // The old environment code no longer works; the new one does.
        expect((await register({ name: 'Old', email: 'old@test.com', role: 'admin', adminCode: 'env-admin-code-123' })).status).toBe(403);
        expect((await register({ name: 'New', email: 'new@test.com', role: 'superadmin', adminCode: NEW_CODE })).status).toBe(201);

        const log = await AuditLog.findOne({ action: 'ADMIN_SIGNUP_CODE_CHANGED' });
        expect(log).toBeTruthy();
        expect(String(log.actor)).toBe(String(sa.id));
    });

    test('codes shorter than 8 characters are refused', async () => {
        const sa = await makeUser('superadmin');
        const res = await api().put('/api/v1/super-admin/signup-code').set(auth(sa.token)).send({ code: 'short' });
        expect(res.status).toBe(400);
    });

    test.each(['admin', 'provider', 'customer'])('a %s cannot read or change the code', async (role) => {
        const u = await makeUser(role);
        expect((await api().get('/api/v1/super-admin/signup-code').set(auth(u.token))).status).toBe(403);
        expect((await api().put('/api/v1/super-admin/signup-code').set(auth(u.token)).send({ code: NEW_CODE })).status).toBe(403);
    });
});
