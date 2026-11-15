const { api, makeUser, makeEvent, auth } = require('../helpers');
const Ticket = require('../../models/Ticket');
const Notification = require('../../models/Notification');

describe('Ticketing', () => {
    let customer, provider, event;

    beforeEach(async () => {
        customer = await makeUser('customer');
        provider = await makeUser('provider');
        event = await makeEvent(provider.id);
    });

    const purchase = (overrides = {}) =>
        api().post('/api/v1/tickets/purchase').set(auth(customer.token))
            .send({ eventId: event._id.toString(), ticketType: 'VIP', price: 500, ...overrides });

    describe('Purchase', () => {
        it('returns 201, not 500, on a successful purchase', async () => {
            // The notification written after saving used the wrong field name
            // and threw inside the try block, so every successful purchase
            // reported failure to the user.
            const res = await purchase();
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('issues a unique ticket number', async () => {
            const a = await purchase();
            const b = await purchase();
            expect(a.body.data.ticketNumber).not.toBe(b.body.data.ticketNumber);
        });

        it('renders the QR server-side as a data URI, with no external service', async () => {
            const res = await purchase();
            expect(res.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
            expect(res.body.data.qrCode).not.toContain('qrserver');
        });

        it('notifies the buyer', async () => {
            await purchase();
            const notes = await Notification.find({ recipient: customer.id });
            expect(notes.length).toBeGreaterThan(0);
            expect(notes[0].title).toMatch(/ticket/i);
        });

        it('returns 404 for an event that does not exist', async () => {
            const res = await purchase({ eventId: '507f1f77bcf86cd799439011' });
            expect(res.status).toBe(404);
        });

        it('requires authentication', async () => {
            const res = await api().post('/api/v1/tickets/purchase').send({ eventId: event._id.toString() });
            expect(res.status).toBe(401);
        });
    });

    describe('Wallet', () => {
        it('returns only the caller tickets', async () => {
            await purchase();
            const other = await makeUser('customer');
            await api().post('/api/v1/tickets/purchase').set(auth(other.token))
                .send({ eventId: event._id.toString(), ticketType: 'General' });

            const res = await api().get('/api/v1/tickets/my').set(auth(customer.token));
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        it('attaches a rendered QR to every pass', async () => {
            await purchase();
            const res = await api().get('/api/v1/tickets/my').set(auth(customer.token));
            expect(res.body.data[0].qrCode).toMatch(/^data:image\/png;base64,/);
        });

        it('returns an empty list rather than invented demo tickets', async () => {
            const res = await api().get('/api/v1/tickets/my').set(auth(customer.token));
            expect(res.body.data).toEqual([]);
        });
    });

    describe('Gate check-in', () => {
        it('checks a valid ticket in', async () => {
            const { body } = await purchase();
            const res = await api().post('/api/v1/tickets/scan').set(auth(provider.token))
                .send({ ticketNumber: body.data.ticketNumber });

            expect(res.status).toBe(200);
            const ticket = await Ticket.findOne({ ticketNumber: body.data.ticketNumber });
            expect(ticket.status).toBe('checked_in');
            expect(ticket.checkInTime).toBeTruthy();
        });

        it('records who performed the check-in', async () => {
            const { body } = await purchase();
            await api().post('/api/v1/tickets/scan').set(auth(provider.token))
                .send({ ticketNumber: body.data.ticketNumber });

            const ticket = await Ticket.findOne({ ticketNumber: body.data.ticketNumber });
            expect(ticket.checkedInBy.toString()).toBe(provider.id);
        });

        it('rejects a second scan of the same ticket', async () => {
            const { body } = await purchase();
            await api().post('/api/v1/tickets/scan').set(auth(provider.token))
                .send({ ticketNumber: body.data.ticketNumber });

            const res = await api().post('/api/v1/tickets/scan').set(auth(provider.token))
                .send({ ticketNumber: body.data.ticketNumber });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/duplicate/i);
        });

        it('forbids a customer from scanning tickets (role guard)', async () => {
            const { body } = await purchase();
            const res = await api().post('/api/v1/tickets/scan').set(auth(customer.token))
                .send({ ticketNumber: body.data.ticketNumber });
            expect(res.status).toBe(403);
            const ticket = await Ticket.findOne({ ticketNumber: body.data.ticketNumber });
            expect(ticket.status).toBe('active');
        });

        it('forbids a provider from scanning a pass for an event they do not run', async () => {
            const { body } = await purchase();
            const other = await makeUser('provider');
            const res = await api().post('/api/v1/tickets/scan').set(auth(other.token))
                .send({ ticketNumber: body.data.ticketNumber });
            expect(res.status).toBe(403);
        });

        it('rejects an unknown ticket code', async () => {
            const res = await api().post('/api/v1/tickets/scan').set(auth(provider.token))
                .send({ ticketNumber: 'TKT-DOES-NOT-EXIST' });
            expect(res.status).toBe(404);
        });
    });
});

describe('Ticket purchase integrity', () => {
    const { api: http, makeUser: mk, makeEvent: mkEvent, auth: hdr } = require('../helpers');
    const Ticket = require('../../models/Ticket');
    const Event = require('../../models/Event');

    const buy = (user, event, extra = {}) =>
        http().post('/api/v1/tickets/purchase').set(hdr(user.token)).send({ eventId: String(event._id), ...extra });

    it('charges the event price, ignoring any price sent by the client', async () => {
        const provider = await mk('provider');
        const customer = await mk('customer');
        const event = await mkEvent(provider.id, { price: 5000 });
        const res = await buy(customer, event, { price: 0 });
        expect(res.status).toBe(201);
        expect(res.body.data.price).toBe(5000);
    });

    it('refuses to oversell an event', async () => {
        const provider = await mk('provider');
        const a = await mk('customer');
        const b = await mk('customer');
        const event = await mkEvent(provider.id, { capacity: 1 });
        expect((await buy(a, event)).status).toBe(201);
        const second = await buy(b, event);
        expect(second.status).toBe(409);
        expect(await Ticket.countDocuments({ event: event._id })).toBe(1);
    });

    it('does not sell tickets for a cancelled event', async () => {
        const provider = await mk('provider');
        const customer = await mk('customer');
        const event = await mkEvent(provider.id);
        await Event.findByIdAndUpdate(event._id, { status: 'cancelled' });
        expect((await buy(customer, event)).status).toBe(409);
    });
});

describe('Ticket lifecycle', () => {
    const { api: http, makeUser: mk, makeEvent: mkEvent, auth: hdr } = require('../helpers');
    const buy = (user, event) => http().post('/api/v1/tickets/purchase').set(hdr(user.token)).send({ eventId: String(event._id) });

    it('lets an attendee cancel their pass, which frees the seat', async () => {
        const provider = await mk('provider');
        const a = await mk('customer');
        const b = await mk('customer');
        const event = await mkEvent(provider.id, { capacity: 1 });
        const first = await buy(a, event);
        expect((await buy(b, event)).status).toBe(409);
        const cancel = await http().put(`/api/v1/tickets/${first.body.data._id}/cancel`).set(hdr(a.token));
        expect(cancel.status).toBe(200);
        expect((await buy(b, event)).status).toBe(201);
    });

    it('does not let someone else cancel a ticket, or cancel it twice', async () => {
        const provider = await mk('provider');
        const a = await mk('customer');
        const intruder = await mk('customer');
        const event = await mkEvent(provider.id);
        const t = await buy(a, event);
        expect((await http().put(`/api/v1/tickets/${t.body.data._id}/cancel`).set(hdr(intruder.token))).status).toBe(403);
        await http().put(`/api/v1/tickets/${t.body.data._id}/cancel`).set(hdr(a.token));
        expect((await http().put(`/api/v1/tickets/${t.body.data._id}/cancel`).set(hdr(a.token))).status).toBe(409);
    });

    it('shows ticket sales to the event owner only', async () => {
        const owner = await mk('provider');
        const other = await mk('provider');
        const customer = await mk('customer');
        const event = await mkEvent(owner.id, { price: 200, capacity: 50 });
        await buy(customer, event);
        const res = await http().get(`/api/v1/tickets/event/${event._id}`).set(hdr(owner.token));
        expect(res.status).toBe(200);
        expect(res.body.data.summary.sold).toBe(1);
        expect(res.body.data.summary.revenue).toBe(200);
        expect(res.body.data.tickets[0].attendee.name).toBeTruthy();
        expect((await http().get(`/api/v1/tickets/event/${event._id}`).set(hdr(other.token))).status).toBe(403);
        expect((await http().get(`/api/v1/tickets/event/${event._id}`).set(hdr(customer.token))).status).toBe(403);
    });
});
