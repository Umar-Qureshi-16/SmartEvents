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
