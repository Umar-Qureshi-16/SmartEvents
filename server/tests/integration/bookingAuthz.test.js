const { api, makeUser, auth } = require('../helpers');

describe('Booking authorization and state machine', () => {
    let customer, provider, outsiderCustomer, outsiderProvider, bookingId;

    const put = (action, who) => api().put(`/api/v1/bookings/${bookingId}/${action}`).set(auth(who.token));

    beforeEach(async () => {
        customer = await makeUser('customer');
        provider = await makeUser('provider');
        outsiderCustomer = await makeUser('customer');
        outsiderProvider = await makeUser('provider');
        const res = await api().post('/api/v1/bookings').set(auth(customer.token)).send({
            vendorId: provider.id,
            offerPrice: 500,
            eventDetails: { eventType: 'Wedding', date: new Date(Date.now() + 30 * 86400000).toISOString(), location: 'Lahore' },
        });
        bookingId = res.body.data._id || res.body.data.id;
    });

    test('users who are not party to the booking cannot act on it', async () => {
        expect((await put('accept', outsiderCustomer)).status).toBe(403);
        expect((await put('accept', outsiderProvider)).status).toBe(403);
        expect((await put('reject', outsiderProvider)).status).toBe(403);
        expect((await put('cancel', outsiderCustomer)).status).toBe(403);
        const neg = await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(outsiderCustomer.token)).send({ price: 1 });
        expect(neg.status).toBe(403);
    });

    test('a party cannot accept their own offer', async () => {
        expect((await put('accept', customer)).status).toBe(409);
        expect((await put('accept', provider)).status).toBe(200);
    });

    test('the other party can accept a counter-offer, the author cannot', async () => {
        await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(provider.token)).send({ price: 600 });
        expect((await put('accept', provider)).status).toBe(409);
        expect((await put('accept', customer)).status).toBe(200);
    });

    test('finished bookings cannot be re-opened or changed again', async () => {
        await put('accept', provider);
        expect((await put('reject', provider)).status).toBe(409);
        expect((await put('accept', provider)).status).toBe(409);
        expect((await put('cancel', provider)).status).toBe(200);
        expect((await put('cancel', customer)).status).toBe(409);
    });
});
