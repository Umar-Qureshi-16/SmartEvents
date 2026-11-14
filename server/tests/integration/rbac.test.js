const { api, makeUser, makeEvent, auth } = require('../helpers');
const Booking = require('../../models/Booking');
const AuditLog = require('../../models/AuditLog');

describe('Role-based access control', () => {
    let customer, provider, admin, superadmin;

    beforeEach(async () => {
        customer = await makeUser('customer');
        provider = await makeUser('provider');
        admin = await makeUser('admin');
        superadmin = await makeUser('superadmin');
    });

    describe('Admin surface', () => {
        const adminRoutes = ['/api/v1/admin/users', '/api/v1/admin/stats', '/api/v1/admin/audit-logs'];

        it.each(adminRoutes)('denies a customer access to %s', async (route) => {
            const res = await api().get(route).set(auth(customer.token));
            expect(res.status).toBe(403);
        });

        it.each(adminRoutes)('denies a provider access to %s', async (route) => {
            const res = await api().get(route).set(auth(provider.token));
            expect(res.status).toBe(403);
        });

        it.each(adminRoutes)('allows an admin to access %s', async (route) => {
            const res = await api().get(route).set(auth(admin.token));
            expect(res.status).toBe(200);
        });

        it('requires authentication', async () => {
            const res = await api().get('/api/v1/admin/users');
            expect(res.status).toBe(401);
        });
    });

    describe('Super admin surface', () => {
        const routes = [
            '/api/v1/super-admin/stats',
            '/api/v1/super-admin/revenue-series',
            '/api/v1/super-admin/fraud-risks',
            '/api/v1/super-admin/providers',
            '/api/v1/super-admin/disputes',
            '/api/v1/super-admin/logs',
        ];

        it.each(routes)('denies an ordinary admin access to %s', async (route) => {
            const res = await api().get(route).set(auth(admin.token));
            expect(res.status).toBe(403);
        });

        it.each(routes)('allows a superadmin to access %s', async (route) => {
            const res = await api().get(route).set(auth(superadmin.token));
            expect(res.status).toBe(200);
        });
    });

    describe('Event ownership', () => {
        it('returns 400, not 500, when a required field is missing', async () => {
            // The Event model requires a date; omitting it used to reach
            // Mongoose and surface as an opaque 500.
            const res = await api().post('/api/v1/events').set(auth(provider.token)).send({
                title: 'No Date', category: 'Corporate', price: 100,
                description: 'A description long enough to pass validation.',
                location: 'Lahore',
            });
            expect(res.status).toBe(400);
        });

        it('lets a provider create an event', async () => {
            const res = await api().post('/api/v1/events').set(auth(provider.token)).send({
                title: 'Provider Event', category: 'Corporate', price: 1000,
                description: 'A description long enough to pass validation.',
                location: 'Lahore', capacity: 50,
                date: new Date(Date.now() + 30 * 86400000).toISOString(),
            });
            expect(res.status).toBe(201);
        });

        it('does not let a customer create an event', async () => {
            const res = await api().post('/api/v1/events').set(auth(customer.token)).send({
                title: 'Nope', category: 'Corporate', price: 1000,
                description: 'A description long enough to pass validation.',
                location: 'Lahore', capacity: 50,
                date: new Date(Date.now() + 30 * 86400000).toISOString(),
            });
            expect(res.status).toBe(403);
        });

        it('does not let one provider edit another provider event', async () => {
            const other = await makeUser('provider');
            const event = await makeEvent(other.id);

            const res = await api().put(`/api/v1/events/${event._id}`).set(auth(provider.token)).send({
                title: 'Hijacked', category: 'Corporate', price: 1,
                description: 'Attempting to modify an event I do not own.',
                location: 'Lahore', capacity: 10,
                date: new Date(Date.now() + 30 * 86400000).toISOString(),
            });
            expect(res.status).toBe(403);
        });

        it('lets an admin delete any event', async () => {
            const event = await makeEvent(provider.id);
            const res = await api().delete(`/api/v1/events/${event._id}`).set(auth(admin.token));
            expect(res.status).toBe(200);
        });
    });

    describe('Role escalation guards', () => {
        it('does not let an admin grant superadmin', async () => {
            const res = await api().put(`/api/v1/admin/users/${customer.id}/role`)
                .set(auth(admin.token)).send({ role: 'superadmin' });
            expect(res.status).toBe(403);
        });

        it('lets a superadmin grant superadmin', async () => {
            const res = await api().put(`/api/v1/admin/users/${customer.id}/role`)
                .set(auth(superadmin.token)).send({ role: 'superadmin' });
            expect(res.status).toBe(200);
        });

        it('rejects an unknown role value', async () => {
            const res = await api().put(`/api/v1/admin/users/${customer.id}/role`)
                .set(auth(admin.token)).send({ role: 'wizard' });
            expect(res.status).toBe(400);
        });

        it('does not let an admin ban their own account', async () => {
            const res = await api().put(`/api/v1/admin/users/${admin.id}/ban`)
                .set(auth(admin.token)).send({ status: 'banned' });
            expect(res.status).toBe(400);
        });
    });

    describe('Governance auditing', () => {
        it('writes an audit entry when a user is banned', async () => {
            await api().put(`/api/v1/admin/users/${customer.id}/ban`)
                .set(auth(admin.token)).send({ status: 'banned' });

            const logs = await AuditLog.find({ action: 'USER_BANNED' });
            expect(logs).toHaveLength(1);
            expect(logs[0].actor.toString()).toBe(admin.id);
        });

        it('writes an audit entry on a superadmin governance action', async () => {
            await api().post('/api/v1/super-admin/user-governance')
                .set(auth(superadmin.token)).send({ userId: provider.id, action: 'restrict' });

            const logs = await AuditLog.find({ action: 'USER_RESTRICT' });
            expect(logs).toHaveLength(1);
        });

        it('rejects an unrecognised governance action', async () => {
            const res = await api().post('/api/v1/super-admin/user-governance')
                .set(auth(superadmin.token)).send({ userId: provider.id, action: 'vaporise' });
            expect(res.status).toBe(400);
        });

        it('reinstates a restricted account', async () => {
            await api().post('/api/v1/super-admin/user-governance')
                .set(auth(superadmin.token)).send({ userId: provider.id, action: 'restrict' });
            const res = await api().post('/api/v1/super-admin/user-governance')
                .set(auth(superadmin.token)).send({ userId: provider.id, action: 'reinstate' });
            expect(res.body.data.status).toBe('active');
        });
    });

    describe('Dispute resolution', () => {
        let bookingId;

        beforeEach(async () => {
            const event = await makeEvent(provider.id);
            bookingId = (await api().post('/api/v1/bookings').set(auth(customer.token))
                .send({ eventId: event._id.toString(), offerPrice: 3000 })).body.data._id;
            await api().put(`/api/v1/bookings/${bookingId}/accept`).set(auth(provider.token));
            await api().post(`/api/v1/bookings/${bookingId}/dispute`).set(auth(customer.token))
                .send({ reason: 'The service delivered did not match what was agreed.' });
        });

        it('cancels the booking when resolved in the customer favour', async () => {
            const res = await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`)
                .set(auth(admin.token)).send({ resolution: 'refunded_customer' });
            expect(res.body.data.status).toBe('cancelled');
            expect(res.body.data.disputeOutcome).toBe('refunded_customer');
        });

        it('completes the booking when resolved in the provider favour', async () => {
            const res = await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`)
                .set(auth(admin.token)).send({ resolution: 'released_vendor' });
            expect(res.body.data.status).toBe('completed');
        });

        it('rejects an invalid resolution value', async () => {
            const res = await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`)
                .set(auth(admin.token)).send({ resolution: 'coin_flip' });
            expect(res.status).toBe(400);
        });

        it('refuses to resolve the same dispute twice', async () => {
            await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`)
                .set(auth(admin.token)).send({ resolution: 'released_vendor' });
            const res = await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`)
                .set(auth(admin.token)).send({ resolution: 'released_vendor' });
            expect(res.status).toBe(400);
        });

        it('is not reachable by a customer', async () => {
            const res = await api().put(`/api/v1/admin/bookings/${bookingId}/resolve-dispute`)
                .set(auth(customer.token)).send({ resolution: 'refunded_customer' });
            expect(res.status).toBe(403);
        });
    });
});
