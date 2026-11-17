process.env.ADMIN_SIGNUP_CODE = 'admin-gate-code-1';

const bcrypt = require('bcrypt');
const { api, PASSWORD } = require('../helpers');
const User = require('../../models/User');

const login = (body) => api().post('/api/v1/auth/login').send(body);

async function createAccount(role, email) {
    await User.create({ name: `T ${role}`, email, role, password: await bcrypt.hash(PASSWORD, 10), isEmailVerified: true });
}

describe('Admin-level sign-in needs the admin code', () => {
    test.each(['admin', 'superadmin'])('a %s without the code is told the code is required', async (role) => {
        await createAccount(role, `${role}@gate.test`);
        const res = await login({ email: `${role}@gate.test`, password: PASSWORD });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ADMIN_CODE_REQUIRED');
    });

    test('a wrong code is refused', async () => {
        await createAccount('admin', 'wrong@gate.test');
        const res = await login({ email: 'wrong@gate.test', password: PASSWORD, adminCode: 'nope-nope' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('ADMIN_CODE_INVALID');
    });

    test('the right code signs the admin in', async () => {
        await createAccount('superadmin', 'ok@gate.test');
        const res = await login({ email: 'ok@gate.test', password: PASSWORD, adminCode: 'admin-gate-code-1' });
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('superadmin');
    });

    test('a wrong password is still refused before the code is considered', async () => {
        await createAccount('admin', 'pw@gate.test');
        const res = await login({ email: 'pw@gate.test', password: 'wrong-password', adminCode: 'admin-gate-code-1' });
        expect(res.status).toBe(401);
    });

    test.each(['customer', 'provider'])('a %s signs in without any code', async (role) => {
        await createAccount(role, `${role}@gate.test`);
        const res = await login({ email: `${role}@gate.test`, password: PASSWORD });
        expect(res.status).toBe(200);
    });
});

describe('Google sign-up creates the vendor profile', () => {
    test('a new provider signing up with Google gets a starter profile with the chosen category', async () => {
        const { OAuth2Client } = require('google-auth-library');
        const env = require('../../config/env');
        env.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || 'test-client-id';
        const spy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
            getPayload: () => ({ sub: 'g-123', email: 'gvendor@test.com', name: 'Google Vendor' }),
        });
        const res = await api().post('/api/v1/auth/google').send({ credential: 'fake', role: 'provider', category: 'photography' });
        expect(res.status).toBe(200);
        const VendorProfile = require('../../models/VendorProfile');
        const user = await User.findOne({ email: 'gvendor@test.com' });
        const profile = await VendorProfile.findOne({ userId: user._id });
        expect(profile.category).toBe('photography');
        spy.mockRestore();
    });
});
