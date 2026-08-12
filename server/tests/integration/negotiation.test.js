const { api, makeUser, makeEvent, auth } = require('../helpers');
const Booking = require('../../models/Booking');
const VendorProfile = require('../../models/VendorProfile');

/**
 * The negotiation engine is the project's flagship feature, so it carries the
 * most thorough coverage.
 */
describe('Negotiation lifecycle', () => {
    let customer, provider, outsider, event;

    beforeEach(async () => {
        customer = await makeUser('customer');
        provider = await makeUser('provider');
        outsider = await makeUser('customer');
        event = await makeEvent(provider.id);
    });

    const createBooking = (price = 4000, message = 'Initial offer from the customer.') =>
        api().post('/api/v1/bookings').set(auth(customer.token))
            .send({ eventId: event._id.toString(), offerPrice: price, message });

    describe('Creating an offer', () => {
        it('creates a booking with the first entry in the negotiation history', async () => {
            const res = await createBooking(4000, 'Can you do 4000?');
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('pending');
            expect(res.body.data.negotiationHistory).toHaveLength(1);
            expect(res.body.data.negotiationHistory[0].message).toBe('Can you do 4000?');
            expect(res.body.data.negotiationHistory[0].action).toBe('offer');
        });

        it('resolves the vendor from the event automatically', async () => {
            const res = await createBooking();
            expect(res.body.data.vendorId).toBe(provider.id);
        });

        it('rejects an offer of zero or less', async () => {
            const res = await createBooking(0);
            expect(res.status).toBe(400);
        });

        it('requires either an eventId or a vendorId', async () => {
            const res = await api().post('/api/v1/bookings').set(auth(customer.token)).send({ offerPrice: 100 });
            expect(res.status).toBe(400);
        });

        it('supports booking a vendor directly, without an event listing', async () => {
            const res = await api().post('/api/v1/bookings').set(auth(customer.token)).send({
                vendorId: provider.id,
                offerPrice: 900,
                eventDetails: {
                    eventType: 'Corporate',
                    date: new Date(Date.now() + 20 * 86400000).toISOString(),
                    location: 'Karachi',
                },
            });
            expect(res.status).toBe(201);
        });

        it('refuses a date the provider has blocked', async () => {
            const blocked = new Date(Date.now() + 10 * 86400000);
            await VendorProfile.create({
                userId: provider.id, businessName: 'Blocked Co', category: 'catering',
                location: 'Lahore', blockedDates: [blocked],
            });

            const res = await api().post('/api/v1/bookings').set(auth(customer.token)).send({
                vendorId: provider.id,
                offerPrice: 500,
                eventDetails: { eventType: 'Wedding', date: blocked.toISOString(), location: 'Lahore' },
            });
            expect(res.status).toBe(409);
        });

        it('does not let a provider create a booking', async () => {
            const res = await api().post('/api/v1/bookings').set(auth(provider.token))
                .send({ eventId: event._id.toString(), offerPrice: 100 });
            expect(res.status).toBe(403);
        });
    });

    describe('Counter-offers', () => {
        let bookingId;
        beforeEach(async () => { bookingId = (await createBooking(4000)).body.data._id; });

        it('records the counter and moves the booking to negotiating', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`)
                .set(auth(provider.token)).send({ price: 4500, message: 'Best I can do is 4500.' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('negotiating');
            expect(res.body.data.negotiationHistory).toHaveLength(2);
        });

        it('preserves the note text on each counter', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`)
                .set(auth(provider.token)).send({ price: 4500, message: 'Weekday rates are lower.' });
            const last = res.body.data.negotiationHistory.at(-1);
            expect(last.message).toBe('Weekday rates are lower.');
            expect(last.action).toBe('counter');
        });

        it('moves the previous price into lastPrice so a delta can be shown', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`)
                .set(auth(provider.token)).send({ price: 4500 });
            expect(res.body.data.lastPrice).toBe(4000);
            expect(res.body.data.offerPrice).toBe(4500);
        });

        it('keeps the history append-only across several rounds', async () => {
            await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(provider.token)).send({ price: 4800 });
            await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(customer.token)).send({ price: 4200 });
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(provider.token)).send({ price: 4500 });

            const prices = res.body.data.negotiationHistory.map(h => h.price);
            expect(prices).toEqual([4000, 4800, 4200, 4500]);
        });

        it('rejects a non-positive counter-offer', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`)
                .set(auth(provider.token)).send({ price: -50 });
            expect(res.status).toBe(400);
        });

        it('refuses to negotiate on a confirmed booking', async () => {
            await api().put(`/api/v1/bookings/${bookingId}/accept`).set(auth(provider.token));
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`)
                .set(auth(customer.token)).send({ price: 3000 });
            expect(res.status).toBe(409);
        });

        it('refuses to negotiate on a rejected booking', async () => {
            await api().put(`/api/v1/bookings/${bookingId}/reject`).set(auth(provider.token));
            const res = await api().post(`/api/v1/bookings/${bookingId}/negotiate`)
                .set(auth(customer.token)).send({ price: 3000 });
            expect(res.status).toBe(409);
        });
    });

    describe('Access control', () => {
        let bookingId;
        beforeEach(async () => { bookingId = (await createBooking()).body.data._id; });

        it('lets the customer read their own booking', async () => {
            const res = await api().get(`/api/v1/bookings/${bookingId}`).set(auth(customer.token));
            expect(res.status).toBe(200);
        });

        it('lets the provider read a booking made against them', async () => {
            const res = await api().get(`/api/v1/bookings/${bookingId}`).set(auth(provider.token));
            expect(res.status).toBe(200);
        });

        it('returns 403, not 500, when a third party tries to read it', async () => {
            const res = await api().get(`/api/v1/bookings/${bookingId}`).set(auth(outsider.token));
            expect(res.status).toBe(403);
        });

        it('returns 404 for a booking that does not exist', async () => {
            const res = await api().get('/api/v1/bookings/507f1f77bcf86cd799439011').set(auth(customer.token));
            expect(res.status).toBe(404);
        });
    });

    describe('Settlement', () => {
        let bookingId;
        beforeEach(async () => { bookingId = (await createBooking()).body.data._id; });

        it('confirms the booking on accept', async () => {
            const res = await api().put(`/api/v1/bookings/${bookingId}/accept`).set(auth(provider.token));
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('confirmed');
        });

        it('rejects the booking on reject', async () => {
            const res = await api().put(`/api/v1/bookings/${bookingId}/reject`).set(auth(provider.token));
            expect(res.body.data.status).toBe('rejected');
        });

        it('records who cancelled, which the trust score depends on', async () => {
            await api().put(`/api/v1/bookings/${bookingId}/cancel`).set(auth(provider.token));
            const booking = await Booking.findById(bookingId);
            expect(booking.cancelledBy.toString()).toBe(provider.id);
        });
    });

    describe('Disputes', () => {
        let bookingId;
        beforeEach(async () => {
            bookingId = (await createBooking()).body.data._id;
            await api().put(`/api/v1/bookings/${bookingId}/accept`).set(auth(provider.token));
        });

        it('lets a party dispute a confirmed booking', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/dispute`).set(auth(customer.token))
                .send({ reason: 'The provider did not arrive at the agreed venue.' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('disputed');
        });

        it('requires a meaningful reason', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/dispute`)
                .set(auth(customer.token)).send({ reason: 'bad' });
            expect(res.status).toBe(400);
        });

        it('does not let an outsider dispute the booking', async () => {
            const res = await api().post(`/api/v1/bookings/${bookingId}/dispute`).set(auth(outsider.token))
                .send({ reason: 'I would like to interfere with this booking.' });
            expect(res.status).toBe(403);
        });

        it('cannot dispute a booking that was never confirmed', async () => {
            const fresh = (await createBooking()).body.data._id;
            const res = await api().post(`/api/v1/bookings/${fresh}/dispute`).set(auth(customer.token))
                .send({ reason: 'Trying to dispute a pending booking.' });
            expect(res.status).toBe(409);
        });
    });

    describe('Provider dashboard aggregation', () => {
        it('sums confirmed bookings into total earnings', async () => {
            const a = (await createBooking(4000)).body.data._id;
            const b = (await createBooking(2500)).body.data._id;
            await api().put(`/api/v1/bookings/${a}/accept`).set(auth(provider.token));
            await api().put(`/api/v1/bookings/${b}/accept`).set(auth(provider.token));

            const res = await api().get('/api/v1/bookings/organizer/dashboard').set(auth(provider.token));
            expect(res.status).toBe(200);
            expect(res.body.data.analytics.totalEarnings).toBe(6500);
            expect(res.body.data.analytics.totalBookingsCount).toBe(2);
        });

        it('reports zero earnings rather than failing when there are no bookings', async () => {
            const res = await api().get('/api/v1/bookings/organizer/dashboard').set(auth(provider.token));
            expect(res.body.data.analytics.totalEarnings).toBe(0);
        });

        it('is not reachable by a customer', async () => {
            const res = await api().get('/api/v1/bookings/organizer/dashboard').set(auth(customer.token));
            expect(res.status).toBe(403);
        });
    });
});
