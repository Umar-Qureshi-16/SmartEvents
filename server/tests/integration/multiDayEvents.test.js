jest.mock('../../services/groqClient', () => ({
    ...jest.requireActual('../../services/groqClient'),
    complete: jest.fn(async () => { throw new Error('AI offline in tests'); }),
}));

const { api, makeUser, makeEvent, auth } = require('../helpers');
const VendorProfile = require('../../models/VendorProfile');
const Service = require('../../models/Service');
const Booking = require('../../models/Booking');
const EventPlan = require('../../models/EventPlan');

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function vendorWithPackage(category, price = 300) {
    const v = await makeUser('provider');
    const profile = await VendorProfile.findOneAndUpdate({ userId: v.id }, { businessName: `${category} co`, category, location: 'Lahore' }, { upsert: true, new: true });
    const service = await Service.create({ vendorId: profile._id, title: `${category} package`, price, description: `${category} package`, eventType: 'conference' });
    return { v, profile, service };
}

describe('Events over several days', () => {
    test('a vendor lists a three-day conference; bookings carry both days', async () => {
        const v = await makeUser('provider');
        const res = await api().post('/api/v1/events').set(auth(v.token)).send({
            title: 'Tech Summit Hall', category: 'Conference', price: 3000, location: 'Lahore',
            description: 'Main hall with stage and seating for three days.', capacity: 400,
            date: inDays(40), endDate: inDays(42),
        });
        expect(res.status).toBe(201);
        expect(new Date(res.body.data.endDate).toISOString().slice(0, 10)).toBe(inDays(42));

        const org = await makeUser('customer');
        const b = await api().post('/api/v1/bookings').set(auth(org.token)).send({ eventId: res.body.data._id, offerPrice: 2800 });
        expect(b.status).toBe(201);
        expect(new Date(b.body.data.eventDetails.endDate).toISOString().slice(0, 10)).toBe(inDays(42));
    });

    test('the last day cannot be before the first, and an event is at most 30 days', async () => {
        const v = await makeUser('provider');
        const base = { title: 'Bad Dates', category: 'Conference', price: 100, location: 'Lahore', description: 'Dates that do not make sense.' };
        expect((await api().post('/api/v1/events').set(auth(v.token)).send({ ...base, date: inDays(10), endDate: inDays(8) })).status).toBe(400);
        expect((await api().post('/api/v1/events').set(auth(v.token)).send({ ...base, date: inDays(10), endDate: inDays(50) })).status).toBe(400);

        const org = await makeUser('customer');
        expect((await api().post('/api/v1/plans').set(auth(org.token)).send({ title: 'Too long', date: inDays(10), days: 40 })).status).toBe(400);
    });

    test('an organizer plans a three-day event and changes it to four days', async () => {
        const org = await makeUser('customer');
        const created = await api().post('/api/v1/plans').set(auth(org.token)).send({ title: 'AI Conference', eventType: 'Conference', date: inDays(60), days: 3, location: 'Lahore' });
        expect(created.status).toBe(201);
        expect(new Date(created.body.data.endDate).toISOString().slice(0, 10)).toBe(inDays(62));

        const edited = await api().put(`/api/v1/plans/${created.body.data._id}`).set(auth(org.token)).send({ days: 4 });
        expect(edited.status).toBe(200);
        expect(new Date(edited.body.data.endDate).toISOString().slice(0, 10)).toBe(inDays(63));

        const oneDay = await api().put(`/api/v1/plans/${created.body.data._id}`).set(auth(org.token)).send({ days: 1 });
        expect(oneDay.body.data.endDate).toBeUndefined();
    });
});

describe('Bookings grouped under the organizer\'s event', () => {
    test('packages booked for an event belong to it, with its dates', async () => {
        const venue = await vendorWithPackage('venue', 900);
        const food = await vendorWithPackage('catering', 600);
        const org = await makeUser('customer');
        const plan = (await api().post('/api/v1/plans').set(auth(org.token)).send({ title: 'Our Conference', eventType: 'Conference', date: inDays(30), days: 2, location: 'Lahore' })).body.data;

        for (const s of [venue.service, food.service]) {
            const r = await api().post('/api/v1/plans/book-package').set(auth(org.token)).send({ serviceId: String(s._id), planId: plan._id });
            expect(r.status).toBe(201);
        }
        const mine = (await api().get('/api/v1/bookings/my').set(auth(org.token))).body.data;
        expect(mine).toHaveLength(2);
        expect(mine.every((b) => b.planId?._id === plan._id && b.planId.title === 'Our Conference')).toBe(true);
        expect(mine.every((b) => new Date(b.eventDetails.endDate).toISOString().slice(0, 10) === inDays(31))).toBe(true);
    });

    test('a booking can be moved into one of my events and out again, but not into someone else\'s', async () => {
        const v = await makeUser('provider');
        const ev = await makeEvent(v.id);
        const org = await makeUser('customer');
        const other = await makeUser('customer');
        const b = (await api().post('/api/v1/bookings').set(auth(org.token)).send({ eventId: String(ev._id), offerPrice: 4000 })).body.data;
        const mine = (await api().post('/api/v1/plans').set(auth(org.token)).send({ title: 'Walima', date: inDays(30) })).body.data;
        const theirs = (await api().post('/api/v1/plans').set(auth(other.token)).send({ title: 'Theirs', date: inDays(30) })).body.data;

        const moved = await api().put(`/api/v1/bookings/${b._id}/plan`).set(auth(org.token)).send({ planId: mine._id });
        expect(moved.status).toBe(200);
        expect(moved.body.data.planId.title).toBe('Walima');

        expect((await api().put(`/api/v1/bookings/${b._id}/plan`).set(auth(org.token)).send({ planId: theirs._id })).status).toBe(404);
        expect((await api().put(`/api/v1/bookings/${b._id}/plan`).set(auth(other.token)).send({ planId: theirs._id })).status).toBe(403);
        expect((await api().put(`/api/v1/bookings/${b._id}/plan`).set(auth(v.token)).send({ planId: mine._id })).status).toBe(403);

        await api().put(`/api/v1/bookings/${b._id}/plan`).set(auth(org.token)).send({ planId: null });
        expect((await Booking.findById(b._id).lean()).planId).toBeUndefined();
    });

    test('older bookings are matched to their event through the plan checklist', async () => {
        const v = await makeUser('provider');
        const ev = await makeEvent(v.id);
        const org = await makeUser('customer');
        const b = (await api().post('/api/v1/bookings').set(auth(org.token)).send({ eventId: String(ev._id), offerPrice: 4000 })).body.data;
        const plan = await EventPlan.create({ owner: org.id, title: 'Old Plan', date: new Date(Date.now() + 20 * 86400000), tasks: [{ title: 'Book the venue', bookingId: b._id, status: 'done' }] });
        await Booking.updateOne({ _id: b._id }, { $unset: { planId: 1 } });

        const mine = (await api().get('/api/v1/bookings/my').set(auth(org.token))).body.data;
        expect(mine[0].planId?._id).toBe(String(plan._id));
    });

    test('deleting an event leaves its bookings without an event', async () => {
        const pkg = await vendorWithPackage('decoration', 200);
        const org = await makeUser('customer');
        const plan = (await api().post('/api/v1/plans').set(auth(org.token)).send({ title: 'Mehndi', date: inDays(30) })).body.data;
        const { bookingId } = (await api().post('/api/v1/plans/book-package').set(auth(org.token)).send({ serviceId: String(pkg.service._id), planId: plan._id })).body.data;
        expect((await Booking.findById(bookingId).lean()).planId).toBeDefined();
        await api().delete(`/api/v1/plans/${plan._id}`).set(auth(org.token));
        expect((await Booking.findById(bookingId).lean()).planId).toBeUndefined();
    });
});
