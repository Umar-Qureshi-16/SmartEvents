// Deployments without SMTP turn verification off; every role must then be usable at once.
process.env.EMAIL_VERIFICATION_REQUIRED = 'false';

const { api, PASSWORD } = require('../helpers');

describe('Signup with email verification disabled', () => {
    test.each(['customer', 'provider'])('a %s can sign in straight after registering', async (role) => {
        const email = `${role}@noemail.com`;
        const res = await api().post('/api/v1/auth/register').send({ name: 'No Email', email, password: PASSWORD, role });
        expect(res.status).toBe(201);
        expect(res.body.user.isEmailVerified).toBe(true);
        const login = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
        expect(login.status).toBe(200);
        expect(login.body.user.role).toBe(role);
    });
});
