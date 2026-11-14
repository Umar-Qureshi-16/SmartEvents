const { api, makeUser, makeEvent, auth } = require('../helpers');
const Event = require('../../models/Event');
const Booking = require('../../models/Booking');

const validEventBody = (over = {}) => ({
    title: 'Updated Title',
    category: 'Corporate',
    price: 6000,
    description: 'An updated description that is long enough.',
    location: 'Lahore',
    capacity: 120,
    date: new Date(Date.now() + 40 * 86400000).toISOString(),
    ...over,
});

describe('Event ownership and editing', () => {
    test('another provider cannot edit someone else\'s event', async () => {
        const owner = await makeUser('provider');
        const other = await makeUser('provider');
        const ev = await makeEvent(owner.id);
        const res = await api().put(`/api/v1/events/${ev._id}`).set(auth(other.token)).send(validEventBody());
        expect(res.status).toBe(403);
        expect((await Event.findById(ev._id)).title).toBe('Test Event');
    });

    test('an owner cannot transfer an event to someone else via the update body', async () => {
        const owner = await makeUser('provider');
        const other = await makeUser('provider');
        const ev = await makeEvent(owner.id);
        const res = await api().put(`/api/v1/events/${ev._id}`).set(auth(owner.token))
            .send(validEventBody({ createdBy: other.id }));
        expect(res.status).toBe(200);
        const after = await Event.findById(ev._id);
        expect(String(after.createdBy)).toBe(String(owner.id));
        expect(after.title).toBe('Updated Title');
    });

    test('a superadmin can delete an event that has no active bookings', async () => {
        const owner = await makeUser('provider');
        const sup = await makeUser('superadmin');
        const ev = await makeEvent(owner.id);
        const res = await api().delete(`/api/v1/events/${ev._id}`).set(auth(sup.token));
        expect(res.status).toBe(200);
        expect(await Event.findById(ev._id)).toBeNull();
    });

    test('an event with a live booking cannot be deleted', async () => {
        const owner = await makeUser('provider');
        const customer = await makeUser('customer');
        const ev = await makeEvent(owner.id);
        await Booking.create({
            customerId: customer.id, vendorId: owner.id, eventId: ev._id, status: 'confirmed', offerPrice: 100,
            eventDetails: { eventType: 'Corporate', date: new Date(Date.now() + 86400000), location: 'Lahore' },
        });
        const res = await api().delete(`/api/v1/events/${ev._id}`).set(auth(owner.token));
        expect(res.status).toBe(409);
        expect(await Event.findById(ev._id)).not.toBeNull();
    });
});

describe('Admin dispute handling', () => {
    test('admins can list disputes; customers and providers cannot', async () => {
        const admin = await makeUser('admin');
        const customer = await makeUser('customer');
        const provider = await makeUser('provider');
        await Booking.create({
            customerId: customer.id, vendorId: provider.id, status: 'disputed', offerPrice: 300,
            escrow: { status: 'held', amount: 300 },
            eventDetails: { eventType: 'Wedding', date: new Date(Date.now() + 86400000), location: 'Lahore' },
        });
        const ok = await api().get('/api/v1/admin/disputes').set(auth(admin.token));
        expect(ok.status).toBe(200);
        expect(ok.body.data).toHaveLength(1);
        expect(ok.body.data[0].escrow.status).toBe('held');
        expect((await api().get('/api/v1/admin/disputes').set(auth(customer.token))).status).toBe(403);
        expect((await api().get('/api/v1/admin/disputes').set(auth(provider.token))).status).toBe(403);
    });
});
