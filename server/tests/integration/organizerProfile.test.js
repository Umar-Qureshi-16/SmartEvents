const { api, makeUser, makeEvent, auth } = require('../helpers');
const Booking = require('../../models/Booking');
const VendorProfile = require('../../models/VendorProfile');

describe('Organizer profile', () => {
    test('the organizer edits their profile and sees stats, upcoming events, spending, reviews and following', async () => {
        const vendor = await makeUser('provider');
        await VendorProfile.findOneAndUpdate({ userId: vendor.id }, { businessName: 'Bloom Hall', category: 'venue', location: 'Lahore' }, { upsert: true });
        const ev = await makeEvent(vendor.id, { title: 'Garden Mehndi' });
        const me = await makeUser('customer', { name: 'Sara Ahmed' });
        await Booking.create({ customerId: me.id, vendorId: vendor.id, eventId: ev._id, status: 'completed', offerPrice: 1200, eventDetails: { eventType: 'Mehndi', date: new Date(Date.now() - 5 * 86400000), location: 'Lahore' } });
        await Booking.create({ customerId: me.id, vendorId: vendor.id, eventId: ev._id, status: 'confirmed', offerPrice: 800, eventDetails: { eventType: 'Walima', date: new Date(Date.now() + 20 * 86400000), location: 'Lahore' } });
        await Booking.create({ customerId: me.id, vendorId: vendor.id, eventId: ev._id, status: 'negotiating', offerPrice: 500, eventDetails: { eventType: 'Party', date: new Date(Date.now() + 40 * 86400000), location: 'Lahore' } });
        await api().post('/api/v1/reviews').set(auth(me.token)).send({ eventId: String(ev._id), rating: 5, comment: 'Beautiful garden, great staff.' });
        await api().post('/api/v1/auth/favorites').set(auth(me.token)).send({ vendorId: vendor.id });

        const upd = await api().put('/api/v1/organizers/me').set(auth(me.token)).send({ bio: 'Planning my sister\'s wedding.', city: 'Lahore', interests: ['Weddings', 'Mehndi'] });
        expect(upd.status).toBe(200);
        expect((await api().put('/api/v1/organizers/me').set(auth(me.token)).send({ avatar: 'not a link' })).status).toBe(400);

        const res = await api().get('/api/v1/organizers/me').set(auth(me.token));
        const d = res.body.data;
        expect(d.user).toMatchObject({ name: 'Sara Ahmed', city: 'Lahore', interests: ['Weddings', 'Mehndi'] });
        expect(d.stats).toMatchObject({ bookings: 3, active: 1, confirmed: 1, completed: 1, spent: 2000, reviews: 1, following: 1 });
        expect(d.upcoming.map((u) => u.title)).toEqual(['Garden Mehndi']);
        expect(d.spending).toHaveLength(2);
        expect(d.reviews[0]).toMatchObject({ rating: 5, vendor: { name: 'Bloom Hall' } });
        expect(d.following[0]).toMatchObject({ businessName: 'Bloom Hall' });
    });

    test('a vendor sees an organizer only after receiving an offer, and never their email', async () => {
        const vendor = await makeUser('provider');
        const stranger = await makeUser('provider');
        const org = await makeUser('customer');
        await Booking.create({ customerId: org.id, vendorId: vendor.id, status: 'pending', offerPrice: 300, eventDetails: { eventType: 'Party', date: new Date(), location: 'Lahore' } });

        const ok = await api().get(`/api/v1/organizers/${org.id}`).set(auth(vendor.token));
        expect(ok.status).toBe(200);
        expect(ok.body.data.stats).toMatchObject({ bookings: 1, completed: 0 });
        expect(JSON.stringify(ok.body)).not.toContain('@test.com');
        expect((await api().get(`/api/v1/organizers/${org.id}`).set(auth(stranger.token))).status).toBe(403);
        expect((await api().get('/api/v1/organizers/me').set(auth(vendor.token))).status).toBe(403);
    });
});
