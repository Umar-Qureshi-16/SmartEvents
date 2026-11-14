const {
    validate, signupSchema, loginSchema, bookingCreateSchema,
    negotiateSchema, disputeSchema, resetPasswordSchema, eventSchema,
} = require('../../utils/validation');
const sanitize = require('../../middleware/sanitize');

/** Runs a schema through the middleware and reports what the caller would see. */
const run = (schema, body) => {
    let status = null, payload = null, passed = false;
    const res = { status(c) { status = c; return this; }, json(p) { payload = p; return this; } };
    const req = { body };
    validate(schema)(req, res, () => { passed = true; });
    return { passed, status, errors: payload?.errors, body: req.body };
};

describe('Request validation', () => {
    it('returns 400 with field-level errors, not a 500', () => {
        // Zod 4 renamed ZodError.errors to .issues; reading the old property
        // threw a TypeError and turned every validation failure into a 500.
        const r = run(signupSchema, { name: 'A', email: 'nope', password: 'x' });
        expect(r.passed).toBe(false);
        expect(r.status).toBe(400);
        expect(r.errors.length).toBeGreaterThan(0);
        expect(r.errors[0]).toHaveProperty('path');
        expect(r.errors[0]).toHaveProperty('message');
    });

    describe('signup', () => {
        it('accepts customer and provider', () => {
            expect(run(signupSchema, { name: 'Ok', email: 'a@b.com', password: 'password123', role: 'customer' }).passed).toBe(true);
            expect(run(signupSchema, { name: 'Ok', email: 'a@b.com', password: 'password123', role: 'provider' }).passed).toBe(true);
        });

        // Elevated roles pass the schema; authService.signup then requires the
        // server-side ADMIN_SIGNUP_CODE (covered in integration/security.test.js).
        it.each(['admin', 'superadmin'])('accepts the elevated role %s at schema level', (role) => {
            expect(run(signupSchema, { name: 'Ok', email: 'a@b.com', password: 'password123', role }).passed).toBe(true);
        });

        it('rejects unknown roles', () => {
            expect(run(signupSchema, { name: 'Ok', email: 'a@b.com', password: 'password123', role: 'root' }).passed).toBe(false);
        });

        it('defaults the role to customer when omitted', () => {
            const r = run(signupSchema, { name: 'Ok', email: 'a@b.com', password: 'password123' });
            expect(r.passed).toBe(true);
            expect(r.body.role).toBe('customer');
        });

        it('enforces a minimum password length', () => {
            expect(run(signupSchema, { name: 'Ok', email: 'a@b.com', password: 'short' }).passed).toBe(false);
        });
    });

    describe('booking creation', () => {
        const oid = '507f1f77bcf86cd799439011';

        it('accepts an event booking', () => {
            expect(run(bookingCreateSchema, { eventId: oid, offerPrice: 100 }).passed).toBe(true);
        });

        it('accepts a vendor-direct booking', () => {
            expect(run(bookingCreateSchema, { vendorId: oid, offerPrice: 100 }).passed).toBe(true);
        });

        it('rejects a booking with neither target', () => {
            expect(run(bookingCreateSchema, { offerPrice: 100 }).passed).toBe(false);
        });

        it.each([0, -1])('rejects a non-positive offer of %s', (offerPrice) => {
            expect(run(bookingCreateSchema, { eventId: oid, offerPrice }).passed).toBe(false);
        });

        it('coerces a numeric string price to a number', () => {
            const r = run(bookingCreateSchema, { eventId: oid, offerPrice: '250' });
            expect(r.passed).toBe(true);
            expect(r.body.offerPrice).toBe(250);
        });
    });

    describe('negotiation and disputes', () => {
        it('rejects a zero counter-offer', () => {
            expect(run(negotiateSchema, { price: 0 }).passed).toBe(false);
        });

        it('caps the note length', () => {
            expect(run(negotiateSchema, { price: 10, message: 'x'.repeat(501) }).passed).toBe(false);
        });

        it('requires a substantive dispute reason', () => {
            expect(run(disputeSchema, { reason: 'bad' }).passed).toBe(false);
            expect(run(disputeSchema, { reason: 'The provider never arrived.' }).passed).toBe(true);
        });
    });

    describe('password reset', () => {
        it('accepts either password or newPassword, for client compatibility', () => {
            expect(run(resetPasswordSchema, { token: 't', password: 'password123' }).passed).toBe(true);
            expect(run(resetPasswordSchema, { token: 't', newPassword: 'password123' }).passed).toBe(true);
        });

        it('rejects a payload with neither', () => {
            expect(run(resetPasswordSchema, { token: 't' }).passed).toBe(false);
        });
    });

    describe('events', () => {
        it('rejects a category outside the enum', () => {
            expect(run(eventSchema, {
                title: 'Valid Title', category: 'Rave', price: 10,
                location: 'Lahore', description: 'A sufficiently long description.',
            }).passed).toBe(false);
        });

        it('rejects a negative price', () => {
            expect(run(eventSchema, {
                title: 'Valid Title', category: 'Wedding', price: -5,
                location: 'Lahore', description: 'A sufficiently long description.',
            }).passed).toBe(false);
        });
    });
});

describe('Mongo operator sanitisation', () => {
    const call = (req) => { const next = jest.fn(); sanitize(req, {}, next); return { req, next }; };

    it('strips $-prefixed keys from the body, blocking operator injection', () => {
        const { req } = call({ body: { email: { $ne: null }, password: 'x' } });
        expect(req.body.email).toEqual({});
        expect(req.body.password).toBe('x');
    });

    it('strips dotted keys that reach into nested documents', () => {
        const { req } = call({ body: { 'businessDetails.verified': true, name: 'ok' } });
        expect(req.body['businessDetails.verified']).toBeUndefined();
        expect(req.body.name).toBe('ok');
    });

    it('sanitises nested objects and arrays', () => {
        const { req } = call({ body: { filter: { nested: { $gt: 1 }, safe: 2 }, list: [{ $where: 'x' }, { ok: 1 }] } });
        expect(req.req?.body?.filter).toBeUndefined();
        expect(req.body.filter.nested).toEqual({});
        expect(req.body.filter.safe).toBe(2);
        expect(req.body.list[0]).toEqual({});
        expect(req.body.list[1].ok).toBe(1);
    });

    it('leaves ordinary payloads untouched', () => {
        const { req, next } = call({ body: { title: 'Wedding', price: 100, tags: ['a', 'b'] } });
        expect(req.body).toEqual({ title: 'Wedding', price: 100, tags: ['a', 'b'] });
        expect(next).toHaveBeenCalled();
    });

    it('removes operator keys from the query without reassigning it', () => {
        // Express 5 exposes req.query as a getter, so it must be mutated in place.
        const query = { $where: 'malicious', page: '2' };
        const { req } = call({ query });
        expect(req.query.$where).toBeUndefined();
        expect(req.query.page).toBe('2');
    });
});
