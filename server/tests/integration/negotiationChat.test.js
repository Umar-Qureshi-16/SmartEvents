const { api, makeUser, makeEvent, auth } = require('../helpers');
const Booking = require('../../models/Booking');

/**
 * Changing your own offer before it is answered, and chatting next to the
 * offers without waiting for your turn.
 */
describe('Negotiation: revise your offer and chat', () => {
    let customer, provider, outsider, bookingId;

    beforeEach(async () => {
        customer = await makeUser('customer');
        provider = await makeUser('provider');
        outsider = await makeUser('customer');
        const event = await makeEvent(provider.id);
        const res = await api().post('/api/v1/bookings').set(auth(customer.token))
            .send({ eventId: event._id.toString(), offerPrice: 4000, message: 'Can you do 4000?' });
        bookingId = res.body.data._id;
    });

    const revise = (who, price, message) => api().put(`/api/v1/bookings/${bookingId}/offer`).set(auth(who.token)).send({ price, message });
    const chat = (who, text) => api().post(`/api/v1/bookings/${bookingId}/messages`).set(auth(who.token)).send({ text });

    it('lets you change your own latest offer and keeps the old price', async () => {
        const res = await revise(customer, 4300, 'Make it 4300 with the stage lights.');
        expect(res.status).toBe(200);
        const b = await Booking.findById(bookingId).lean();
        expect(b.offerPrice).toBe(4300);
        expect(b.negotiationHistory).toHaveLength(1);
        expect(b.negotiationHistory[0]).toMatchObject({ price: 4300, previousPrice: 4000, message: 'Make it 4300 with the stage lights.' });
        expect(b.negotiationHistory[0].editedAt).toBeTruthy();
    });

    it('does not let you change the other side\'s offer, or yours once they answered', async () => {
        expect((await revise(provider, 3000)).status).toBe(409);
        await api().post(`/api/v1/bookings/${bookingId}/negotiate`).set(auth(provider.token)).send({ price: 4800 });
        expect((await revise(customer, 4100)).status).toBe(409);
        expect((await revise(outsider, 1)).status).toBe(403);
    });

    it('rejects a revised price of zero', async () => {
        expect((await revise(customer, 0)).status).toBe(400);
    });

    it('lets both sides chat at any time without changing whose turn it is', async () => {
        expect((await chat(customer, 'Is the hall air-conditioned?')).status).toBe(201);
        expect((await chat(customer, 'And is parking included?')).status).toBe(201);
        expect((await chat(provider, 'Yes to both.')).status).toBe(201);
        const b = await Booking.findById(bookingId).lean();
        expect(b.chatMessages.map((m) => m.text)).toEqual(['Is the hall air-conditioned?', 'And is parking included?', 'Yes to both.']);
        // The customer's offer is still the latest, so the customer still cannot accept it.
        expect((await api().put(`/api/v1/bookings/${bookingId}/accept`).set(auth(customer.token))).status).toBe(409);
        expect((await api().put(`/api/v1/bookings/${bookingId}/accept`).set(auth(provider.token))).status).toBe(200);
        // Chat stays open after the booking is confirmed.
        expect((await chat(provider, 'See you on the day.')).status).toBe(201);
    });

    it('refuses empty messages and outsiders', async () => {
        expect((await chat(customer, '   ')).status).toBe(400);
        expect((await chat(outsider, 'Hello')).status).toBe(403);
    });
});
