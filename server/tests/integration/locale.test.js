const { api, makeUser, auth } = require('../helpers');
const User = require('../../models/User');
const { buildPrompt } = require('../../services/decorImage');
const { cultureFor } = require('../../config/regions');

describe('Country, region and currency', () => {
    test('lists countries with their regions, currencies and rates', async () => {
        const res = await api().get('/api/v1/locale');
        expect(res.status).toBe(200);
        expect(res.body.data.base).toBe('USD');
        expect(res.body.data.countries.PK.currency).toBe('PKR');
        expect(res.body.data.countries.PK.regions).toEqual(expect.arrayContaining(['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan']));
        expect(res.body.data.rates.PKR).toBeGreaterThan(100);
    });

    test('a user saves their country and region; a region from another country is refused', async () => {
        const u = await makeUser('provider');
        const ok = await api().put('/api/v1/locale/me').set(auth(u.token)).send({ country: 'PK', region: 'Sindh' });
        expect(ok.status).toBe(200);
        expect((await User.findById(u.id).lean()).locale).toMatchObject({ country: 'PK', region: 'Sindh' });

        expect((await api().put('/api/v1/locale/me').set(auth(u.token)).send({ country: 'GB', region: 'Punjab' })).status).toBe(400);
        expect((await api().put('/api/v1/locale/me').set(auth(u.token)).send({ country: 'ZZ' })).status).toBe(400);
        expect((await api().put('/api/v1/locale/me').send({ country: 'PK' })).status).toBe(401);
    });

    test('new accounts default to Pakistan, and /me returns the locale', async () => {
        const u = await makeUser('customer');
        const me = await api().get('/api/v1/auth/me').set(auth(u.token));
        expect(me.body.user.locale.country).toBe('PK');
    });
});

describe('Designs follow the event culture', () => {
    test('a walima picture is a Pakistani couple stage, never a Western altar', () => {
        const p = buildPrompt({ theme: 'Royal Garden', eventType: 'Walima', locale: { country: 'PK', region: 'Punjab' } });
        expect(p).toMatch(/Pakistani walima/i);
        expect(p).toMatch(/couple sofa/i);
        expect(p).toMatch(/Punjabi/i);
        expect(p).toMatch(/no altar/i);
    });

    test('each region brings its own crafts', () => {
        expect(cultureFor({ country: 'PK', region: 'Sindh' }, 'Mehndi').place).toMatch(/ajrak/i);
        expect(cultureFor({ country: 'PK', region: 'Khyber Pakhtunkhwa' }, 'Nikah').place).toMatch(/Pashtun/i);
        expect(cultureFor({ country: 'GB' }, 'Baraat').place).toMatch(/British-Pakistani/i);
        expect(cultureFor({}, 'Nikah').event).toMatch(/nikah nama/i);
    });
});
