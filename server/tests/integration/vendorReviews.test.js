const { api, makeUser, makeEvent, auth } = require('../helpers');
const Booking = require('../../models/Booking');
const User = require('../../models/User');
const VendorProfile = require('../../models/VendorProfile');

async function bookedCustomer(vendorId, event) {
    const cust = await makeUser('customer');
    await Booking.create({
        customerId: cust.id, vendorId, eventId: event._id, status: 'completed', offerPrice: 1000,
        eventDetails: { eventType: 'Wedding', date: new Date(), location: 'Lahore' },
    });
    return cust;
}

describe('Vendor reviews and star ratings', () => {
    test('reviews on a vendor\'s events roll up into a 5-star summary', async () => {
        const prov = await makeUser('provider');
        const e1 = await makeEvent(prov.id, { title: 'Hall A' });
        const e2 = await makeEvent(prov.id, { title: 'Hall B' });
        const c1 = await bookedCustomer(prov.id, e1);
        const c2 = await bookedCustomer(prov.id, e2);
        expect((await api().post('/api/v1/reviews').set(auth(c1.token)).send({ eventId: String(e1._id), rating: 5, comment: 'Superb service, on time.' })).status).toBe(201);
        expect((await api().post('/api/v1/reviews').set(auth(c2.token)).send({ eventId: String(e2._id), rating: 4, comment: 'Very good, a little late.' })).status).toBe(201);

        const res = await api().get(`/api/v1/reviews/vendor/${prov.id}`);
        expect(res.status).toBe(200);
        expect(res.body.data.summary).toMatchObject({ average: 4.5, count: 2, distribution: { 5: 1, 4: 1 } });
        expect(res.body.data.reviews.map((r) => r.event.title).sort()).toEqual(['Hall A', 'Hall B']);
        expect(res.body.data.reviews[0].user.name).toBeTruthy();
    });

    test('the vendor directory and profile show the real rating', async () => {
        const prov = await makeUser('provider');
        await VendorProfile.findOneAndUpdate({ userId: prov.id }, { businessName: 'Star Hall', category: 'venue', location: 'Lahore' }, { upsert: true });
        const ev = await makeEvent(prov.id);
        const cust = await bookedCustomer(prov.id, ev);
        await api().post('/api/v1/reviews').set(auth(cust.token)).send({ eventId: String(ev._id), rating: 3, comment: 'Average experience.' });

        const list = await api().get('/api/v1/vendor/list');
        const card = (list.body.data || list.body.vendors || []).find((v) => v.businessName === 'Star Hall');
        expect(card).toMatchObject({ rating: 3, reviewsCount: 1 });

        const profile = await api().get(`/api/v1/vendor/profile/${prov.id}`);
        expect(profile.body.profile).toMatchObject({ rating: 3, reviewsCount: 1 });
    });

    test('a customer without a booking cannot review', async () => {
        const prov = await makeUser('provider');
        const ev = await makeEvent(prov.id);
        const stranger = await makeUser('customer');
        const res = await api().post('/api/v1/reviews').set(auth(stranger.token)).send({ eventId: String(ev._id), rating: 5, comment: 'Never went.' });
        expect(res.status).toBe(403);
    });

    test('a blocked vendor takes no new bookings', async () => {
        const prov = await makeUser('provider');
        const ev = await makeEvent(prov.id);
        await User.updateOne({ _id: prov.id }, { status: 'banned' });
        const cust = await makeUser('customer');
        const res = await api().post('/api/v1/bookings').set(auth(cust.token)).send({ eventId: String(ev._id), offerPrice: 900 });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/not taking bookings/);
    });
});

describe('Blocked vendors are hidden from the public', () => {
    test('their events leave the event list', async () => {
        const live = await makeUser('provider');
        const gone = await makeUser('provider');
        await makeEvent(live.id, { title: 'Visible Hall' });
        await makeEvent(gone.id, { title: 'Hidden Hall' });
        await User.updateOne({ _id: gone.id }, { status: 'banned' });
        const titles = (await api().get('/api/v1/events?limit=50')).body;
        const list = JSON.stringify(titles);
        expect(list).toContain('Visible Hall');
        expect(list).not.toContain('Hidden Hall');
    });
});

describe('Public vendor profile', () => {
    test('shows events, packages, gallery, followers and stats, without the email', async () => {
        const prov = await makeUser('provider');
        await VendorProfile.findOneAndUpdate({ userId: prov.id }, { businessName: 'Showcase Hall', category: 'venue', location: 'Lahore', tagline: 'Weddings by the lake', portfolioImages: ['https://img.test/a.jpg'] }, { upsert: true });
        await makeEvent(prov.id, { title: 'Lake Wedding', image: 'https://img.test/b.jpg' });
        const fan = await makeUser('customer');
        expect((await api().post('/api/v1/auth/favorites').set(auth(fan.token)).send({ vendorId: prov.id })).status).toBe(200);
        // Following is idempotent and only works for vendors.
        await api().post('/api/v1/auth/favorites').set(auth(fan.token)).send({ vendorId: prov.id });
        expect((await api().post('/api/v1/auth/favorites').set(auth(fan.token)).send({ vendorId: fan.id })).status).toBe(404);

        const res = await api().get(`/api/v1/vendor/profile/${prov.id}`);
        expect(res.status).toBe(200);
        const { profile, events } = res.body;
        expect(profile.tagline).toBe('Weddings by the lake');
        expect(profile.stats).toMatchObject({ followers: 1, events: 1, upcomingEvents: 1, packages: 0, completedBookings: 0 });
        expect(profile.gallery).toEqual(['https://img.test/a.jpg', 'https://img.test/b.jpg']);
        expect(events.map((e) => e.title)).toEqual(['Lake Wedding']);
        expect(JSON.stringify(res.body)).not.toContain('@test.com');
        expect(profile.available).toBe(true);
    });
});
