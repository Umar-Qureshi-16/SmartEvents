const { api, makeUser, auth } = require('../helpers');
const User = require('../../models/User');

/** The mobile app registers each device for push notifications. */
describe('Push tokens (mobile app)', () => {
    const tokensOf = async (id) => (await User.findById(id).select('+pushTokens').lean()).pushTokens || [];

    it('saves a device once and removes it on sign-out', async () => {
        const u = await makeUser('customer');
        const add = () => api().post('/api/v1/auth/push-token').set(auth(u.token)).send({ token: 'device-abc', platform: 'android' });
        expect((await add()).status).toBe(200);
        expect((await add()).status).toBe(200);
        expect((await tokensOf(u.id)).map((t) => t.token)).toEqual(['device-abc']);

        const del = await api().delete('/api/v1/auth/push-token').set(auth(u.token)).send({ token: 'device-abc' });
        expect(del.status).toBe(200);
        expect(await tokensOf(u.id)).toHaveLength(0);
    });

    it('moves a device to the account that signed in on it last', async () => {
        const a = await makeUser('customer');
        const b = await makeUser('provider');
        await api().post('/api/v1/auth/push-token').set(auth(a.token)).send({ token: 'shared-phone' });
        await api().post('/api/v1/auth/push-token').set(auth(b.token)).send({ token: 'shared-phone' });
        expect(await tokensOf(a.id)).toHaveLength(0);
        expect((await tokensOf(b.id)).map((t) => t.token)).toEqual(['shared-phone']);
    });

    it('needs a token and a signed-in user, and never returns tokens in /me', async () => {
        const u = await makeUser('customer');
        expect((await api().post('/api/v1/auth/push-token').set(auth(u.token)).send({})).status).toBe(400);
        expect((await api().post('/api/v1/auth/push-token').send({ token: 'x' })).status).toBe(401);
        await api().post('/api/v1/auth/push-token').set(auth(u.token)).send({ token: 'secret-device' });
        const me = await api().get('/api/v1/auth/me').set(auth(u.token));
        expect(JSON.stringify(me.body)).not.toContain('secret-device');
    });
});
