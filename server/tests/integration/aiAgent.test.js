// The language model is replaced by a scripted stand-in, so these tests check
// the assistant's own rules: which tools each role sees, that look-ups run,
// that changes are only proposed, and that confirmed changes re-check roles.
jest.mock('../../services/groqClient', () => {
    const actual = jest.requireActual('../../services/groqClient');
    return { ...actual, complete: jest.fn() };
});

const { complete } = require('../../services/groqClient');
const { api, makeUser, makeEvent, auth } = require('../helpers');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const AuditLog = require('../../models/AuditLog');

const toolCall = (name, args) => ({
    choices: [{ message: { content: '', tool_calls: [{ id: `call_${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] } }],
});
const text = (content) => ({ choices: [{ message: { content } }] });

const chat = (token, content) => api().post('/api/v1/ai/agent').set(auth(token)).send({ messages: [{ role: 'user', content }] });
const execute = (token, name, args) => api().post('/api/v1/ai/agent/execute').set(auth(token)).send({ name, args });

afterEach(() => complete.mockReset());

describe('AI assistant: tools per role', () => {
    test('a super admin is offered the admin tools; a customer is not', async () => {
        const sa = await makeUser('superadmin');
        complete.mockResolvedValueOnce(text('Hello'));
        await chat(sa.token, 'hi');
        const saTools = complete.mock.calls[0][0].tools.map((t) => t.function.name);
        expect(saTools).toEqual(expect.arrayContaining(['set_user_status', 'create_user', 'resolve_dispute', 'delete_event']));

        const cust = await makeUser('customer');
        complete.mockResolvedValueOnce(text('Hello'));
        await chat(cust.token, 'hi');
        const custTools = complete.mock.calls[1][0].tools.map((t) => t.function.name);
        expect(custTools).toEqual(expect.arrayContaining(['make_offer', 'search_events']));
        expect(custTools).not.toContain('set_user_status');
        expect(custTools).not.toContain('create_user');
    });
});

describe('AI assistant: look-ups and proposals', () => {
    test('a look-up runs immediately and its result goes back to the model', async () => {
        const admin = await makeUser('admin');
        await makeUser('customer', { email: 'findme@test.com', name: 'Find Me' });
        complete
            .mockResolvedValueOnce(toolCall('find_users', { query: 'findme' }))
            .mockResolvedValueOnce(text('I found Find Me.'));
        const res = await chat(admin.token, 'find the user findme');
        expect(res.status).toBe(200);
        expect(res.body.data.reply).toBe('I found Find Me.');
        const toolMessage = complete.mock.calls[1][0].messages.find((m) => m.role === 'tool');
        expect(toolMessage.content).toContain('findme@test.com');
    });

    test('a change is only proposed, not carried out', async () => {
        const admin = await makeUser('admin');
        await makeUser('customer', { email: 'target@test.com' });
        complete.mockResolvedValueOnce(toolCall('set_user_status', { email: 'target@test.com', status: 'banned' }));
        const res = await chat(admin.token, 'ban target@test.com');
        expect(res.body.data.pendingAction).toMatchObject({ name: 'set_user_status', args: { email: 'target@test.com', status: 'banned' } });
        expect(res.body.data.pendingAction.summary).toMatch(/Ban the user target@test.com/);
        expect((await User.findOne({ email: 'target@test.com' })).status).not.toBe('banned');
    });

    test('a tool outside the role is refused even if the model asks for it', async () => {
        const cust = await makeUser('customer');
        complete
            .mockResolvedValueOnce(toolCall('create_user', { name: 'Evil', email: 'evil@test.com', role: 'admin' }))
            .mockResolvedValueOnce(text('I cannot do that.'));
        const res = await chat(cust.token, 'make me an admin account');
        expect(res.body.data.pendingAction).toBeUndefined();
        expect(await User.findOne({ email: 'evil@test.com' })).toBeNull();
    });
});

describe('AI assistant: confirmed actions', () => {
    test('an admin can ban a customer, and the action is audited', async () => {
        const admin = await makeUser('admin');
        const target = await makeUser('customer', { email: 'ban@test.com' });
        const res = await execute(admin.token, 'set_user_status', { email: 'ban@test.com', status: 'banned' });
        expect(res.status).toBe(200);
        expect((await User.findById(target.id)).status).toBe('banned');
        const log = await AuditLog.findOne({ action: 'USER_BAN' });
        expect(log.metadata.via).toBe('ai-assistant');
    });

    test('an ordinary admin cannot act on another admin or create an admin', async () => {
        const admin = await makeUser('admin');
        await makeUser('admin', { email: 'other-admin@test.com' });
        expect((await execute(admin.token, 'set_user_status', { email: 'other-admin@test.com', status: 'banned' })).status).toBe(403);
        expect((await execute(admin.token, 'create_user', { name: 'New Admin', email: 'na@test.com', role: 'admin' })).status).toBe(403);
    });

    test('a super admin can create an account and receives a one-time password', async () => {
        const sa = await makeUser('superadmin');
        const res = await execute(sa.token, 'create_user', { name: 'Fresh Vendor', email: 'fresh@test.com', role: 'provider' });
        expect(res.status).toBe(200);
        expect(res.body.data.temporaryPassword).toEqual(expect.any(String));
        const login = await api().post('/api/v1/auth/login').send({ email: 'fresh@test.com', password: res.body.data.temporaryPassword });
        expect(login.status).toBe(200);
    });

    test('a customer cannot run admin actions directly', async () => {
        const cust = await makeUser('customer');
        await makeUser('customer', { email: 'victim@test.com' });
        expect((await execute(cust.token, 'set_user_status', { email: 'victim@test.com', status: 'banned' })).status).toBe(403);
    });

    test('a provider can publish an event and a customer can make an offer on it', async () => {
        const prov = await makeUser('provider');
        const created = await execute(prov.token, 'create_event', {
            title: 'Garden Wedding Package', category: 'Wedding', date: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10),
            price: 3000, capacity: 150, location: 'Lahore', description: 'Outdoor wedding venue with catering for up to 150 guests.',
        });
        expect(created.status).toBe(200);

        const cust = await makeUser('customer');
        const offer = await execute(cust.token, 'make_offer', { eventId: created.body.data.eventId, offerPrice: 2600, message: 'Weekday booking' });
        expect(offer.status).toBe(200);
        const booking = await Booking.findById(offer.body.data.bookingId);
        expect(booking.negotiationHistory[0].action).toBe('offer');
    });

    test('a provider can add a service package with only a title and price', async () => {
        const prov = await makeUser('provider');
        const res = await execute(prov.token, 'create_service', { title: 'Full day photography', price: 1500 });
        expect(res.status).toBe(200);
        expect(res.body.data.message).toMatch(/Full day photography/);
    });

    test('invalid details are rejected with a clear message', async () => {
        const prov = await makeUser('provider');
        const res = await execute(prov.token, 'block_date', { date: 'next someday' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/date/i);
    });

    test('read-only actions cannot be sent to the execute endpoint', async () => {
        const admin = await makeUser('admin');
        expect((await execute(admin.token, 'find_users', {})).status).toBe(400);
    });
});

describe('AI assistant: the full booking workflow', () => {
    async function setup() {
        const prov = await makeUser('provider');
        const cust = await makeUser('customer');
        const ev = await makeEvent(prov.id, { title: 'Garden Hall', price: 3000 });
        const offer = await execute(cust.token, 'make_offer', { eventId: String(ev._id), offerPrice: 2500, message: 'Weekday please' });
        return { prov, cust, ev, bookingId: offer.body.data.bookingId };
    }

    test('vendor counters, customer accepts, customer completes; escrow follows', async () => {
        const { prov, cust, bookingId } = await setup();
        expect((await execute(prov.token, 'counter_offer', { bookingId, price: 2800, message: 'Meet me at 2800' })).status).toBe(200);
        let b = await Booking.findById(bookingId);
        expect(b.offerPrice).toBe(2800);
        expect(b.status).toBe('negotiating');

        expect((await execute(cust.token, 'accept_offer', { bookingId })).status).toBe(200);
        b = await Booking.findById(bookingId);
        expect(b.status).toBe('confirmed');
        expect(b.escrow.status).toBe('held');

        expect((await execute(cust.token, 'complete_booking', { bookingId })).status).toBe(200);
        b = await Booking.findById(bookingId);
        expect(b.status).toBe('completed');
        expect(b.escrow.status).toBe('released');
    });

    test('someone outside the booking cannot act on it', async () => {
        const { bookingId } = await setup();
        const otherVendor = await makeUser('provider');
        const res = await execute(otherVendor.token, 'counter_offer', { bookingId, price: 100 });
        expect(res.status).toBe(403);
    });

    test('my_bookings gives the model ids and whose move it was', async () => {
        const { prov } = await setup();
        complete
            .mockResolvedValueOnce(toolCall('my_bookings', {}))
            .mockResolvedValueOnce(text('You have one offer.'));
        await chat(prov.token, 'show my bookings');
        const toolMessage = JSON.parse(complete.mock.calls[1][0].messages.find((m) => m.role === 'tool').content);
        expect(toolMessage[0]).toMatchObject({ event: 'Garden Hall', status: 'pending', currentPrice: 2500, lastMoveBy: 'customer' });
    });

    test('customer gets a pass, vendor checks it in once, customer reviews after a confirmed booking', async () => {
        const { prov, cust, ev, bookingId } = await setup();
        const pass = await execute(cust.token, 'get_pass', { eventId: String(ev._id) });
        expect(pass.status).toBe(200);
        const Ticket = require('../../models/Ticket');
        const ticket = await Ticket.findOne({ attendee: cust.id });
        expect((await execute(prov.token, 'check_in_pass', { ticketNumber: ticket.ticketNumber })).status).toBe(200);
        expect((await execute(prov.token, 'check_in_pass', { ticketNumber: ticket.ticketNumber })).status).toBe(400);

        // The vendor accepts the customer's opening offer, so a review is allowed.
        expect((await execute(prov.token, 'accept_offer', { bookingId })).status).toBe(200);
        expect((await execute(cust.token, 'leave_review', { eventId: String(ev._id), rating: 5, comment: 'Lovely venue and staff.' })).status).toBe(200);
    });

    test('vendor edits an event, and blocks then unblocks a date', async () => {
        const { prov, ev } = await setup();
        expect((await execute(prov.token, 'update_event', { eventId: String(ev._id), price: 3200 })).status).toBe(200);
        const Event = require('../../models/Event');
        expect((await Event.findById(ev._id)).price).toBe(3200);

        const VendorProfile = require('../../models/VendorProfile');
        await execute(prov.token, 'block_date', { date: '2026-12-24' });
        expect((await VendorProfile.findOne({ userId: prov.id })).blockedDates).toHaveLength(1);
        await execute(prov.token, 'unblock_date', { date: '2026-12-24' });
        expect((await VendorProfile.findOne({ userId: prov.id })).blockedDates).toHaveLength(0);
    });
});

describe('AI assistant: disputes through the shared service', () => {
    test('an admin resolves a dispute and escrow is refunded', async () => {
        const prov = await makeUser('provider');
        const cust = await makeUser('customer');
        const ev = await makeEvent(prov.id);
        const booking = await Booking.create({
            customerId: cust.id, vendorId: prov.id, eventId: ev._id, status: 'disputed', offerPrice: 1000,
            escrow: { status: 'held', amount: 1000, heldAt: new Date() },
            eventDetails: { eventType: 'Corporate', date: new Date(), location: 'Lahore' },
        });
        const admin = await makeUser('admin');
        const res = await execute(admin.token, 'resolve_dispute', { bookingId: String(booking._id), resolution: 'refunded_customer' });
        expect(res.status).toBe(200);
        const after = await Booking.findById(booking._id);
        expect(after.status).toBe('cancelled');
        expect(after.escrow.status).toBe('refunded');
    });
});
