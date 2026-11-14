const { api, makeUser, auth, PASSWORD } = require('../helpers');
const User = require('../../models/User');

describe('Authentication', () => {
    describe('POST /auth/register', () => {
        it('creates a customer account', async () => {
            const res = await api().post('/api/v1/auth/register').send({
                name: 'New Customer', email: 'new@test.com', password: PASSWORD, role: 'customer',
            });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('stores the password hashed, never in plain text', async () => {
            await api().post('/api/v1/auth/register').send({
                name: 'Hash Check', email: 'hash@test.com', password: PASSWORD, role: 'customer',
            });
            const user = await User.findOne({ email: 'hash@test.com' }).select('+password');
            expect(user.password).not.toBe(PASSWORD);
            expect(user.password).toMatch(/^\$2[aby]\$/);
        });

        it('refuses to create an admin account without the signup code', async () => {
            const res = await api().post('/api/v1/auth/register').send({
                name: 'Sneaky', email: 'sneaky@test.com', password: PASSWORD, role: 'admin',
            });
            expect(res.status).toBe(403);
        });

        it('refuses to create a superadmin account without the signup code', async () => {
            const res = await api().post('/api/v1/auth/register').send({
                name: 'Sneaky', email: 'sneaky2@test.com', password: PASSWORD, role: 'superadmin',
            });
            expect(res.status).toBe(403);
        });

        it('returns 400 with field-level errors for invalid input', async () => {
            const res = await api().post('/api/v1/auth/register').send({ name: 'A', email: 'nope', password: 'x' });
            expect(res.status).toBe(400);
            expect(Array.isArray(res.body.errors)).toBe(true);
            expect(res.body.errors.length).toBeGreaterThan(0);
        });

        it('rejects a duplicate email', async () => {
            const payload = { name: 'Dup', email: 'dup@test.com', password: PASSWORD, role: 'customer' };
            await api().post('/api/v1/auth/register').send(payload);
            const res = await api().post('/api/v1/auth/register').send(payload);
            expect(res.status).toBe(409);
        });
    });

    describe('POST /auth/login', () => {
        it('issues an access token and a refresh token', async () => {
            const { token, refreshToken } = await makeUser('customer');
            expect(typeof token).toBe('string');
            expect(typeof refreshToken).toBe('string');
        });

        it('never returns the password hash', async () => {
            const { email } = await makeUser('customer');
            const res = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
            expect(res.body.user.password).toBeUndefined();
        });

        it('gives the same message for unknown email and wrong password, preventing enumeration', async () => {
            const { email } = await makeUser('customer');
            const unknown = await api().post('/api/v1/auth/login').send({ email: 'nobody@test.com', password: PASSWORD });
            const wrongPw = await api().post('/api/v1/auth/login').send({ email, password: 'wrongpassword' });

            expect(unknown.status).toBe(401);
            expect(wrongPw.status).toBe(401);
            expect(unknown.body.message).toBe(wrongPw.body.message);
        });

        it('blocks a banned account', async () => {
            const { email } = await makeUser('customer');
            await User.updateOne({ email }, { status: 'banned' });
            const res = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
            expect(res.status).toBe(403);
        });
    });

    describe('Token handling', () => {
        it('returns the current user for a valid token', async () => {
            const { token, email } = await makeUser('provider');
            const res = await api().get('/api/v1/auth/me').set(auth(token));
            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe(email);
        });

        it('rejects a request with no token', async () => {
            const res = await api().get('/api/v1/auth/me');
            expect(res.status).toBe(401);
        });

        it('returns 401 (not 403) for an invalid token so the client refresh flow can fire', async () => {
            const res = await api().get('/api/v1/auth/me').set(auth('not.a.real.token'));
            expect(res.status).toBe(401);
        });

        it('exchanges a refresh token for a new access token', async () => {
            const { refreshToken } = await makeUser('customer');
            const res = await api().post('/api/v1/auth/refresh').send({ refreshToken });
            expect(res.status).toBe(200);
            expect(typeof res.body.token).toBe('string');
        });

        it('rejects a bogus refresh token', async () => {
            const res = await api().post('/api/v1/auth/refresh').send({ refreshToken: 'garbage' });
            expect(res.status).toBe(401);
        });
    });

    describe('Password reset', () => {
        it('never returns the reset token in the response body', async () => {
            const { email } = await makeUser('customer');
            const res = await api().post('/api/v1/auth/forgot-password').send({ email });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeUndefined();
        });

        it('answers identically for a registered and an unregistered email', async () => {
            const { email } = await makeUser('customer');
            const known = await api().post('/api/v1/auth/forgot-password').send({ email });
            const unknown = await api().post('/api/v1/auth/forgot-password').send({ email: 'ghost@test.com' });
            expect(known.body.message).toBe(unknown.body.message);
        });

        it('completes the reset cycle and lets the user sign in with the new password', async () => {
            const { email } = await makeUser('customer');
            await api().post('/api/v1/auth/forgot-password').send({ email });

            const user = await User.findOne({ email });
            const resetRes = await api().post('/api/v1/auth/reset-password')
                .send({ token: user.resetPasswordToken, password: 'brandNewPassword1' });
            expect(resetRes.status).toBe(200);

            const login = await api().post('/api/v1/auth/login').send({ email, password: 'brandNewPassword1' });
            expect(login.status).toBe(200);

            const oldLogin = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
            expect(oldLogin.status).toBe(401);
        });

        it('rejects an expired reset token', async () => {
            const { email } = await makeUser('customer');
            await api().post('/api/v1/auth/forgot-password').send({ email });
            const user = await User.findOne({ email });
            await User.updateOne({ email }, { resetPasswordExpires: new Date(Date.now() - 1000) });

            const res = await api().post('/api/v1/auth/reset-password')
                .send({ token: user.resetPasswordToken, password: 'anotherPassword1' });
            expect(res.status).toBe(400);
        });
    });

    describe('Email verification', () => {
        it('sets isEmailVerified=false and generates a token upon registration', async () => {
            const email = `unverified-${Date.now()}@test.com`;
            const regRes = await api().post('/api/v1/auth/register').send({
                name: 'Unverified User',
                email,
                password: PASSWORD,
                role: 'customer'
            });
            expect(regRes.status).toBe(201);
            expect(regRes.body.success).toBe(true);

            const user = await User.findOne({ email });
            expect(user.isEmailVerified).toBe(false);
            expect(typeof user.emailVerificationToken).toBe('string');
            expect(user.emailVerificationExpires).toBeDefined();

            // Attempting to login before verifying must fail with 403
            const loginRes = await api().post('/api/v1/auth/login').send({
                email,
                password: PASSWORD
            });
            expect(loginRes.status).toBe(403);
            expect(loginRes.body.message).toMatch(/verify/i);

            // Verifying with valid token
            const verifyRes = await api().post('/api/v1/auth/verify-email').send({
                token: user.emailVerificationToken
            });
            expect(verifyRes.status).toBe(200);
            expect(verifyRes.body.success).toBe(true);
            expect(verifyRes.body.token).toBeDefined();
            expect(verifyRes.body.user.isEmailVerified).toBe(true);

            // Login succeeds after verification
            const afterLogin = await api().post('/api/v1/auth/login').send({
                email,
                password: PASSWORD
            });
            expect(afterLogin.status).toBe(200);
        });

        it('rejects an invalid verification token', async () => {
            const res = await api().post('/api/v1/auth/verify-email').send({
                token: 'invalid-or-fake-token'
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid or has expired/i);
        });

        it('resends verification link for unverified email', async () => {
            const email = `resend-${Date.now()}@test.com`;
            await api().post('/api/v1/auth/register').send({
                name: 'Resend Test',
                email,
                password: PASSWORD,
                role: 'customer'
            });

            const initialUser = await User.findOne({ email });
            const initialToken = initialUser.emailVerificationToken;

            const resendRes = await api().post('/api/v1/auth/resend-verification').send({ email });
            expect(resendRes.status).toBe(200);

            const updatedUser = await User.findOne({ email });
            expect(updatedUser.emailVerificationToken).toBeDefined();
            expect(updatedUser.emailVerificationToken).not.toBe(initialToken);
        });
    });
});
