const { api, makeUser, auth } = require('../helpers');
const Booking = require('../../models/Booking');

describe('Simulated escrow (FR-05)', () => {
    let customer, provider, admin, bookingId;

    const put = (action, who) => api().put(`/api/v1/bookings/${bookingId}/${action}`).set(auth(who.token));
    const escrow = async () => (await Booking.findById(bookingId)).escrow;

    beforeEach(async () => {
        customer = await makeUser('customer');
        provider = await makeUser('provider');
        admin = await makeUser('admin');
        const res = await api().post('/api/v1/bookings').set(auth(customer.token)).send({
            vendorId: provider.id,
            offerPrice: 800,
            eventDetails: { eventType: 'Wedding', date: new Date(Date.now() + 30 * 86400000).toISOString(), location: 'Lahore' },
        });
        bookingId = res.body.data._id || res.body.data.id;
    });

    test('no escrow exists before the booking is confirmed', async () => {
        expect((await escrow()).status).toBe('none');
    });

    test('accepting holds the agreed price in escrow', async () => {
        await put('accept', provider);
        const e = await escrow();
        expect(e.status).toBe('held');
        expect(e.amount).toBe(800);
        expect(e.heldAt).toBeTruthy();
    });

    test('the held amount is the final negotiated price', async () => {
        await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(provider.token)).send({ price: 950 });
        await put('accept', customer);
        expect((await escrow()).amount).toBe(950);
    });

    test('the customer completing the booking releases the funds', async () => {
        await put('accept', provider);
        const res = await put('complete', customer);
        expect(res.status).toBe(200);
        const e = await escrow();
        expect(e.status).toBe('released');
        expect(e.settledAt).toBeTruthy();
        expect((await Booking.findById(bookingId)).status).toBe('completed');
    });

    test('the provider cannot release their own funds', async () => {
        await put('accept', provider);
        expect((await put('complete', provider)).status).toBe(403);
        expect((await escrow()).status).toBe('held');
    });

    test('cannot complete a booking that was never confirmed', async () => {
        expect((await put('complete', customer)).status).toBe(409);
    });

    test('cancelling a confirmed booking refunds the customer', async () => {
        await put('accept', provider);
        await put('cancel', provider);
        expect((await escrow()).status).toBe('refunded');
    });

    test('dispute resolution settles escrow either way', async () => {
        await put('accept', provider);
        await api().post(`/api/v1/bookings/${bookingId}/dispute`).set(auth(customer.token)).send({ reason: 'The provider never showed up.' });
        expect((await escrow()).status).toBe('held');
        const res = await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`).set(auth(admin.token)).send({ resolution: 'refunded_customer' });
        expect(res.status).toBe(200);
        expect((await escrow()).status).toBe('refunded');
    });
});
