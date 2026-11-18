jest.mock('../../services/groqClient', () => ({
    ...jest.requireActual('../../services/groqClient'),
    complete: jest.fn(async () => { throw new Error('AI offline in tests'); }),
}));

const { api, makeUser, auth } = require('../helpers');
const VendorProfile = require('../../models/VendorProfile');
const Service = require('../../models/Service');
const Booking = require('../../models/Booking');
const Event = require('../../models/Event');

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const execute = (token, name, args) => api().post('/api/v1/ai/agent/execute').set(auth(token)).send({ name, args });

async function vendor(category, pkgs, location = 'Lahore') {
    const v = await makeUser('provider');
    const profile = await VendorProfile.findOneAndUpdate({ userId: v.id }, { businessName: `${category} house`, category, location }, { upsert: true, new: true });
    const services = [];
    for (const [title, price] of pkgs) services.push(await Service.create({ vendorId: profile._id, title, price, description: `${title} package`, eventType: 'wedding' }));
    return { v, profile, services };
}

describe('Organizer: spend a budget across vendors', () => {
    test('a 1,500 nikah budget picks one package per field that fits, then books them all', async () => {
        await vendor('venue', [['Garden Hall', 500], ['Palace Hall', 1400]]);
        await vendor('catering', [['Nikah Menu', 450], ['Royal Feast', 900]]);
        await vendor('decoration', [['Floral Stage', 200]]);
        await vendor('photography', [['Half-day Shoot', 150]]);
        const org = await makeUser('customer');

        const plan = await api().post('/api/v1/plans/budget').set(auth(org.token)).send({ budget: 1500, eventType: 'Nikah', city: 'Lahore' });
        expect(plan.status).toBe(200);
        const d = plan.body.data;
        const picked = Object.fromEntries(d.items.filter((i) => i.package).map((i) => [i.field, i.package.title]));
        expect(picked).toMatchObject({ venue: 'Garden Hall', catering: 'Nikah Menu', decoration: 'Floral Stage', photography: 'Half-day Shoot' });
        expect(d.total).toBeLessThanOrEqual(1500);
        expect(d.total + d.remaining).toBe(1500);
        expect(d.items.find((i) => i.field === 'venue').alternatives.map((a) => a.title)).toContain('Palace Hall');

        const ids = d.items.filter((i) => i.package).map((i) => i.package._id);
        const booked = await execute(org.token, 'book_bundle', { serviceIds: ids, title: 'Our nikah', eventType: 'Nikah', date: inDays(60), city: 'Lahore' });
        expect(booked.status).toBe(200);
        expect(await Booking.countDocuments({ customerId: org.id, status: 'pending' })).toBe(4);
    });

    test('a wedding gets wedding packages, and leftover money upgrades the picks', async () => {
        const v = await makeUser('provider');
        const profile = await VendorProfile.findOneAndUpdate({ userId: v.id }, { businessName: 'Halls', category: 'venue', location: 'Lahore' }, { upsert: true, new: true });
        await Service.create({ vendorId: profile._id, title: 'Conference Hall', price: 2800, description: 'Full day', eventType: 'corporate' });
        await Service.create({ vendorId: profile._id, title: 'Evening Wedding Hall', price: 4500, description: '400 guests', eventType: 'wedding' });
        await vendor('catering', [['Birthday Menu', 900], ['Wedding Banquet', 5200]]);
        const org = await makeUser('customer');
        const d = (await api().post('/api/v1/plans/budget').set(auth(org.token)).send({ budget: 12000, eventType: 'Wedding', fields: ['venue', 'catering'] })).body.data;
        const picked = Object.fromEntries(d.items.map((i) => [i.field, i.package?.title]));
        expect(picked).toEqual({ venue: 'Evening Wedding Hall', catering: 'Wedding Banquet' });
        expect(d.total).toBe(9700);
    });

    test('a budget below every package says so instead of overspending', async () => {
        await vendor('venue', [['Big Hall', 5000]]);
        const org = await makeUser('customer');
        const d = (await api().post('/api/v1/plans/budget').set(auth(org.token)).send({ budget: 100, eventType: 'Wedding', fields: ['venue'] })).body.data;
        expect(d.items[0].package).toBeNull();
        expect(d.items[0].note).toMatch(/Cheapest venue package/);
        expect(d.total).toBe(0);
    });
});

describe('Vendor: design library with AI', () => {
    test('a vendor drafts a design (within its price), publishes it, and an organizer books it into the Design Studio', async () => {
        const { v } = await vendor('decoration', []);
        const draft = await execute(v.token, 'generate_design', { theme: 'Mughal garden', style: 'Royal', eventType: 'Mehndi', budget: 800, colors: ['#7a1f2b', '#d4af37'] });
        expect(draft.status).toBe(200);
        const id = draft.body.data.designId;

        // Drafts are not public.
        expect((await api().get(`/api/v1/designs?vendor=${v.id}`)).body.data).toHaveLength(0);
        const mine = (await api().get('/api/v1/designs/mine').set(auth(v.token))).body.data;
        expect(mine[0].totalCost).toBeLessThanOrEqual(800);
        expect(mine[0].elements.length).toBeGreaterThan(2);

        expect((await execute(v.token, 'publish_design', { designId: id, price: 750 })).status).toBe(200);
        const pub = (await api().get(`/api/v1/designs?vendor=${v.id}`)).body.data;
        expect(pub).toEqual([expect.objectContaining({ title: mine[0].title, totalCost: 750, vendorProfile: expect.objectContaining({ category: 'decoration' }) })]);

        const org = await makeUser('customer');
        const b = await api().post(`/api/v1/designs/${id}/book`).set(auth(org.token)).send({ date: inDays(40), location: 'Lahore' });
        expect(b.status).toBe(201);
        const booking = await Booking.findById(b.body.data.bookingId).lean();
        expect(booking.offerPrice).toBe(750);
        expect(booking.designConcepts[0]).toMatchObject({ title: mine[0].title, selected: true });
        expect(booking.designBrief.colors.length).toBeGreaterThan(0);
    });

    test('only the owner can edit a design; organizers cannot create them', async () => {
        const { v } = await vendor('decoration', []);
        const other = await vendor('decoration', []);
        const d = (await api().post('/api/v1/designs/generate').set(auth(v.token)).send({ budget: 300 })).body.data;
        expect((await api().put(`/api/v1/designs/${d._id}`).set(auth(other.v.token)).send({ published: true })).status).toBe(403);
        const org = await makeUser('customer');
        expect((await api().post('/api/v1/designs/generate').set(auth(org.token)).send({ budget: 300 })).status).toBe(403);
    });

    test('a vendor publishes an event with a photo through Smartie', async () => {
        const { v } = await vendor('venue', []);
        const r = await execute(v.token, 'create_event', {
            title: 'Rooftop Nikah Package', category: 'Wedding', date: inDays(30), price: 100, capacity: 80,
            location: 'Lahore', description: 'Rooftop nikah setting with seating for 80 guests.', image: 'https://img.test/roof.jpg',
        });
        expect(r.status).toBe(200);
        expect(await Event.findOne({ title: 'Rooftop Nikah Package' }).lean()).toMatchObject({ price: 100, image: 'https://img.test/roof.jpg' });
    });
});

describe('Admin: accounts, bookings and revenue', () => {
    test('overview shows accounts by role, bookings by status, escrow and the 2.5% fee; the list filters', async () => {
        const { v } = await vendor('catering', [['Menu', 1000]]);
        const org = await makeUser('customer', { name: 'Hamza Ali' });
        await Booking.create({ customerId: org.id, vendorId: v.id, status: 'completed', offerPrice: 1000, escrow: { status: 'released', amount: 1000 }, eventDetails: { eventType: 'Walima', date: new Date(), location: 'Lahore' } });
        await Booking.create({ customerId: org.id, vendorId: v.id, status: 'confirmed', offerPrice: 400, escrow: { status: 'held', amount: 400 }, eventDetails: { eventType: 'Mehndi', date: new Date(), location: 'Lahore' } });
        await Booking.create({ customerId: org.id, vendorId: v.id, status: 'pending', offerPrice: 300, eventDetails: { eventType: 'Party', date: new Date(), location: 'Lahore' } });
        const admin = await makeUser('admin');

        const o = (await api().get('/api/v1/admin/overview').set(auth(admin.token))).body.data;
        expect(o.accounts.byRole.customer).toBeGreaterThanOrEqual(1);
        expect(o.bookings).toMatchObject({ total: 3, open: 1 });
        expect(o.revenue).toMatchObject({ gross: 1400, heldInEscrow: 400, released: 1000, platformFee: 25, pendingFee: 10 });
        expect(o.revenue.byField[0]).toMatchObject({ field: 'catering', value: 1400 });

        const list = (await api().get('/api/v1/admin/bookings?status=open').set(auth(admin.token))).body.data;
        expect(list.items).toEqual([expect.objectContaining({ organizer: 'Hamza Ali', status: 'pending', price: 300 })]);
        const search = (await api().get('/api/v1/admin/bookings?q=walima').set(auth(admin.token))).body.data;
        expect(search.total).toBe(1);

        expect((await api().get('/api/v1/admin/overview').set(auth(org.token))).status).toBe(403);
    });
});
