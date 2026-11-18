jest.mock('../../services/groqClient', () => ({
    ...jest.requireActual('../../services/groqClient'),
    complete: jest.fn(async () => { throw new Error('AI offline in tests'); }),
}));

const { api, makeUser, auth } = require('../helpers');
const VendorProfile = require('../../models/VendorProfile');
const Service = require('../../models/Service');
const Booking = require('../../models/Booking');
const User = require('../../models/User');

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function vendorWithPackage(category, title, price, location = 'Lahore') {
    const v = await makeUser('provider');
    const profile = await VendorProfile.findOneAndUpdate(
        { userId: v.id }, { businessName: `${title} Co`, category, location }, { upsert: true, new: true },
    );
    const service = await Service.create({ vendorId: profile._id, title, price, description: `${title} package`, eventType: 'wedding' });
    return { vendor: v, profile, service };
}

describe('Event plans (organizer checklist)', () => {
    test('creates a dated plan from venue booking to final review', async () => {
        const cust = await makeUser('customer');
        const res = await api().post('/api/v1/plans').set(auth(cust.token)).send({ title: 'Royal Palm wedding', eventType: 'Wedding', date: inDays(200), location: 'Lahore' });
        expect(res.status).toBe(201);
        const { tasks } = res.body.data;
        expect(tasks.length).toBeGreaterThanOrEqual(5);
        expect(tasks[0].category).toBe('venue');
        expect(tasks.map((t) => t.title)).toEqual(expect.arrayContaining(['Catering', 'Invitations', 'Final review']));
        // Due dates count back from the event and are in order.
        const due = tasks.map((t) => new Date(t.dueDate).getTime());
        expect([...due].sort((a, b) => a - b)).toEqual(due);
        tasks.forEach((t) => expect(t.status).toBe('todo'));
    });

    test('tasks can be ticked off and added; only the owner sees the plan', async () => {
        const cust = await makeUser('customer');
        const plan = (await api().post('/api/v1/plans').set(auth(cust.token)).send({ title: 'Mehndi', eventType: 'Wedding', date: inDays(90) })).body.data;
        const inv = plan.tasks.find((t) => t.title === 'Invitations');
        const done = await api().patch(`/api/v1/plans/${plan._id}/tasks/${inv._id}`).set(auth(cust.token)).send({ status: 'done' });
        expect(done.body.data.tasks.find((t) => t._id === inv._id).status).toBe('done');

        const added = await api().post(`/api/v1/plans/${plan._id}/tasks`).set(auth(cust.token)).send({ title: 'Book a makeup artist', daysBefore: 20 });
        expect(added.body.data.tasks.find((t) => t.title === 'Book a makeup artist').category).toBe('makeup');

        const other = await makeUser('customer');
        expect((await api().get(`/api/v1/plans/${plan._id}`).set(auth(other.token))).status).toBe(404);
        const vendor = await makeUser('provider');
        expect((await api().get('/api/v1/plans').set(auth(vendor.token))).status).toBe(403);
    });

    test('vendor packages are listed by field, cheapest first, without blocked vendors', async () => {
        await vendorWithPackage('catering', 'Gold Menu', 90000);
        await vendorWithPackage('catering', 'Silver Menu', 60000);
        const blocked = await vendorWithPackage('catering', 'Hidden Menu', 10000);
        await User.updateOne({ _id: blocked.vendor.id }, { status: 'banned' });
        await vendorWithPackage('photography', 'Full Day Shoot', 50000);

        const res = await api().get('/api/v1/plans/packages?category=catering');
        expect(res.status).toBe(200);
        expect(res.body.data.map((p) => p.title)).toEqual(['Silver Menu', 'Gold Menu']);
        expect(res.body.data[0].vendor).toMatchObject({ category: 'catering', location: 'Lahore', rating: 0 });

        const cheap = await api().get('/api/v1/plans/packages?category=catering&maxPrice=70000');
        expect(cheap.body.data.map((p) => p.title)).toEqual(['Silver Menu']);
    });

    test('booking a package for the plan ticks off its task once the vendor accepts', async () => {
        const { vendor, service } = await vendorWithPackage('catering', 'Royal Feast', 120000);
        const cust = await makeUser('customer');
        const plan = (await api().post('/api/v1/plans').set(auth(cust.token)).send({ title: 'Royal Palm', eventType: 'Wedding', date: inDays(150), location: 'Lahore' })).body.data;

        const booked = await api().post('/api/v1/plans/book-package').set(auth(cust.token)).send({ serviceId: String(service._id), planId: plan._id });
        expect(booked.status).toBe(201);
        const booking = await Booking.findById(booked.body.data.bookingId).lean();
        expect(String(booking.vendorId)).toBe(vendor.id);
        expect(booking.offerPrice).toBe(120000);
        expect(new Date(booking.eventDetails.date).toISOString().slice(0, 10)).toBe(inDays(150));

        // Still to do while the offer is pending.
        let p = (await api().get(`/api/v1/plans/${plan._id}`).set(auth(cust.token))).body.data;
        expect(p.tasks.find((t) => t.category === 'catering').status).toBe('todo');

        await Booking.updateOne({ _id: booking._id }, { status: 'confirmed' });
        p = (await api().get(`/api/v1/plans/${plan._id}`).set(auth(cust.token))).body.data;
        const catering = p.tasks.find((t) => t.category === 'catering');
        expect(catering.status).toBe('done');
        expect(catering.bookingId).toBe(String(booking._id));
    });

    test('a plan made from a booking is created once', async () => {
        const { vendor } = await vendorWithPackage('venue', 'Grand Hall', 300000);
        const cust = await makeUser('customer');
        const b = await Booking.create({ customerId: cust.id, vendorId: vendor.id, status: 'confirmed', offerPrice: 300000, eventDetails: { eventType: 'Wedding', date: new Date(Date.now() + 100 * 86400000), location: 'Lahore' } });
        const first = await api().post('/api/v1/plans').set(auth(cust.token)).send({ bookingId: String(b._id) });
        const second = await api().post('/api/v1/plans').set(auth(cust.token)).send({ bookingId: String(b._id) });
        expect(second.body.data._id).toBe(first.body.data._id);
        // The venue is already booked, so that task starts done.
        expect(first.body.data.tasks.find((t) => t.category === 'venue').status).toBe('done');
    });
});

describe('Smartie runs the plan end to end', () => {
    const execute = (token, name, args) => api().post('/api/v1/ai/agent/execute').set(auth(token)).send({ name, args });

    test('create a plan, find packages, book one and tick a task by name', async () => {
        const { service } = await vendorWithPackage('catering', 'Smartie Feast', 80000);
        const cust = await makeUser('customer');

        const created = await execute(cust.token, 'create_plan', { title: 'Royal Palm', eventType: 'Wedding', date: inDays(120) });
        expect(created.status).toBe(200);
        const planId = created.body.data.planId;
        expect(planId).toBeTruthy();

        const found = await require('../../services/aiAgent').ACTIONS.find_packages.run({ category: 'catering' });
        expect(found.map((p) => p.title)).toContain('Smartie Feast');

        const booked = await execute(cust.token, 'book_package', { serviceId: String(service._id), planId });
        expect(booked.status).toBe(200);

        const ticked = await execute(cust.token, 'set_plan_task', { planId, task: 'invitations', status: 'done' });
        expect(ticked.status).toBe(200);
        const plan = (await api().get(`/api/v1/plans/${planId}`).set(auth(cust.token))).body.data;
        expect(plan.tasks.find((t) => t.title === 'Invitations').status).toBe('done');
    });
});
