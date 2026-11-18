/**
 * Smartie as an operator: the user describes a task in plain language and the
 * model picks one of the actions below through tool calling.
 *
 * Safety model
 *  - Each action lists the roles allowed to use it; the model is only shown the
 *    actions for the caller's role, and execute() checks the role again.
 *  - Read-only actions run straight away so the model can look things up.
 *  - Actions that change data are never run by the model. They come back to
 *    the client as a proposal; they only run when the user confirms, through
 *    POST /ai/agent/execute, which re-validates the arguments.
 *  - Every change goes through the same services and audit log as the normal
 *    screens, so the assistant can never do more than the user could by hand.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { z } = require('zod');

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');
const { complete } = require('./groqClient');
const { BadRequestError, ForbiddenError, NotFoundError, ConflictError } = require('../utils/AppError');

const ADMINS = ['admin', 'superadmin'];
const ALL = ['customer', 'provider', 'admin', 'superadmin'];
const ELEVATED = (r) => r === 'admin' || r === 'superadmin';
const EVENT_CATEGORIES = ['Wedding', 'Corporate', 'Concert', 'Birthday', 'Conference', 'Exhibition'];
const MAX_STEPS = 4;
const MAX_HISTORY = 12;

const audit = async (actor, entry) => {
    try {
        await AuditLog.create({ actor: actor.id, ipAddress: actor.ip, severity: 'info', ...entry, metadata: { ...(entry.metadata || {}), via: 'ai-assistant' } });
    } catch (err) {
        console.error('Audit log write failed:', err.message);
    }
};

const findUserByEmail = async (email) => {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) throw new NotFoundError(`No user found with the email ${email}.`);
    return user;
};

/**
 * Runs an existing Express handler with the caller's identity, so actions whose
 * rules live in a controller (tickets, reviews) behave exactly as in the UI.
 */
async function callHandler(handler, actor, body = {}, params = {}) {
    let status = 200;
    let payload;
    const res = {
        status(code) { status = code; return this; },
        json(data) { payload = data; return this; },
    };
    const req = { body, params, query: {}, ip: actor.ip, user: { id: actor.id, _id: actor.id, role: actor.role }, get: () => '' };
    let thrown;
    await handler(req, res, (err) => { thrown = err; });
    if (thrown) throw thrown;
    if (status >= 400) {
        const message = payload?.message || 'That action could not be completed.';
        throw status === 403 ? new ForbiddenError(message) : status === 404 ? new NotFoundError(message) : status === 409 ? new ConflictError(message) : new BadRequestError(message);
    }
    return payload;
}

const bookingSummary = (b, role) => ({
    bookingId: String(b._id),
    event: b.eventId?.title,
    status: b.status,
    currentPrice: b.offerPrice,
    previousPrice: b.lastPrice,
    lastMoveBy: (() => {
        const last = b.negotiationHistory?.[b.negotiationHistory.length - 1];
        if (!last) return undefined;
        return String(last.offeredBy) === String(b.customerId?._id || b.customerId) ? 'customer' : 'provider';
    })(),
    with: role === 'provider' ? b.customerId?.name : b.vendorId?.name,
    escrow: b.escrow?.status,
});

const oid = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid id');
const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Use a date such as 2026-12-20');

/* ------------------------------------------------------------------ actions */

const ACTIONS = {
    /* ---------- read-only (run immediately) ---------- */
    find_users: {
        roles: ADMINS, mutating: false,
        description: 'Search users by name or email, optionally filtered by role or status.',
        params: { query: { type: 'string' }, role: { type: 'string', enum: ALL }, status: { type: 'string', enum: ['active', 'restricted', 'banned'] } },
        schema: z.object({ query: z.string().max(100).optional(), role: z.enum(ALL).optional(), status: z.enum(['active', 'restricted', 'banned']).optional() }),
        run: async ({ query, role, status }) => {
            const filter = {};
            if (query) {
                const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                filter.$or = [{ name: rx }, { email: rx }];
            }
            if (role) filter.role = role;
            if (status) filter.status = status;
            const users = await User.find(filter).select('name email role status trustScore createdAt').limit(15).lean();
            return { count: users.length, users: users.map((u) => ({ name: u.name, email: u.email, role: u.role, status: u.status || 'active', trustScore: u.trustScore })) };
        },
    },
    platform_stats: {
        roles: ADMINS, mutating: false,
        description: 'Platform totals: users by role, events, bookings by status, open disputes and agreed revenue.',
        params: {}, schema: z.object({}),
        run: async () => {
            const [byRole, events, byStatus, revenue] = await Promise.all([
                User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
                Event.countDocuments(),
                Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
                Booking.aggregate([{ $match: { status: { $in: ['confirmed', 'completed'] } } }, { $group: { _id: null, total: { $sum: '$offerPrice' } } }]),
            ]);
            const toObj = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
            const bookings = toObj(byStatus);
            return { usersByRole: toObj(byRole), events, bookingsByStatus: bookings, openDisputes: bookings.disputed || 0, agreedRevenue: revenue[0]?.total || 0 };
        },
    },
    list_disputes: {
        roles: ADMINS, mutating: false,
        description: 'List bookings that are currently under dispute, with their ids.',
        params: {}, schema: z.object({}),
        run: async () => {
            const rows = await Booking.find({ status: 'disputed' }).populate('customerId', 'name email').populate('vendorId', 'name email').populate('eventId', 'title').limit(20).lean();
            return rows.map((b) => ({ bookingId: String(b._id), event: b.eventId?.title, customer: b.customerId?.email, provider: b.vendorId?.email, amount: b.offerPrice }));
        },
    },
    search_events: {
        roles: ALL, mutating: false,
        description: 'Search published events by text, category or maximum price. Returns event ids.',
        params: { query: { type: 'string' }, category: { type: 'string', enum: EVENT_CATEGORIES }, maxPrice: { type: 'number' } },
        schema: z.object({ query: z.string().max(100).optional(), category: z.enum(EVENT_CATEGORIES).optional(), maxPrice: z.coerce.number().positive().optional() }),
        run: async ({ query, category, maxPrice }) => {
            const filter = { status: { $ne: 'cancelled' } };
            if (query) filter.title = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (category) filter.category = category;
            if (maxPrice) filter.price = { $lte: maxPrice };
            const events = await Event.find(filter).select('title category price date location').limit(10).lean();
            return events.map((e) => ({ eventId: String(e._id), title: e.title, category: e.category, price: e.price, date: e.date, location: e.location }));
        },
    },
    my_bookings: {
        roles: ['customer', 'provider'], mutating: false,
        description: "The caller's own bookings with status, price and the other party.",
        params: {}, schema: z.object({}),
        run: async (_a, actor) => {
            const key = actor.role === 'provider' ? 'vendorId' : 'customerId';
            const rows = await Booking.find({ [key]: actor.id }).populate('eventId', 'title').populate('customerId', 'name').populate('vendorId', 'name').sort({ createdAt: -1 }).limit(20).lean();
            return rows.map((b) => bookingSummary(b, actor.role));
        },
    },
    my_events: {
        roles: ['provider'], mutating: false,
        description: "The provider's own event listings with ids, prices, dates and status.",
        params: {}, schema: z.object({}),
        run: async (_a, actor) => {
            const rows = await Event.find({ createdBy: actor.id }).select('title category price date capacity location status').sort({ date: 1 }).lean();
            return rows.map((e) => ({ eventId: String(e._id), title: e.title, category: e.category, price: e.price, date: e.date, capacity: e.capacity, location: e.location, status: e.status }));
        },
    },
    my_services: {
        roles: ['provider'], mutating: false,
        description: "The provider's service packages with ids and prices.",
        params: {}, schema: z.object({}),
        run: async (_a, actor) => {
            const profile = await VendorProfile.findOne({ userId: actor.id }).lean();
            if (!profile) return { services: [], note: 'No vendor profile yet.' };
            const rows = await Service.find({ vendorId: profile._id }).lean();
            return { business: profile.businessName, category: profile.category, blockedDates: profile.blockedDates, services: rows.map((s) => ({ serviceId: String(s._id), title: s.title, price: s.price, eventType: s.eventType })) };
        },
    },
    revenue_summary: {
        roles: ['provider'], mutating: false,
        description: 'Revenue totals for the provider: released, held in escrow, pending offers and completed bookings.',
        params: {}, schema: z.object({}),
        run: async (_a, actor) => {
            const rows = await Booking.find({ vendorId: actor.id }).select('status offerPrice escrow').lean();
            const sum = (f) => rows.filter(f).reduce((t, b) => t + (b.escrow?.amount ?? b.offerPrice ?? 0), 0);
            return {
                releasedToYou: sum((b) => b.escrow?.status === 'released'),
                heldInEscrow: sum((b) => b.escrow?.status === 'held'),
                openOffers: rows.filter((b) => ['pending', 'negotiating'].includes(b.status)).length,
                completedBookings: rows.filter((b) => b.status === 'completed').length,
                totalBookings: rows.length,
            };
        },
    },
    my_tickets: {
        roles: ['customer'], mutating: false,
        description: "The customer's entry passes with event, pass number and status.",
        params: {}, schema: z.object({}),
        run: async (_a, actor) => {
            const Ticket = require('../models/Ticket');
            const rows = await Ticket.find({ attendee: actor.id }).populate('event', 'title date').sort({ createdAt: -1 }).limit(20).lean();
            return rows.map((t) => ({ ticketNumber: t.ticketNumber, event: t.event?.title, date: t.event?.date, status: t.status, type: t.ticketType }));
        },
    },

    /* ---------- booking moves (customer and provider) ---------- */
    counter_offer: {
        roles: ['customer', 'provider'], mutating: true,
        description: 'Send a counter-offer on one of your bookings. Use my_bookings first to get the booking id.',
        params: { bookingId: { type: 'string' }, price: { type: 'number' }, message: { type: 'string' } },
        required: ['bookingId', 'price'],
        schema: z.object({ bookingId: oid, price: z.coerce.number().positive(), message: z.string().max(500).optional() }),
        summary: (a) => `Counter-offer ${a.price} on booking ${a.bookingId}${a.message ? ` with the note "${a.message}"` : ''}`,
        run: async (a, actor) => {
            const bookingService = require('./bookingService');
            await bookingService.negotiate(a.bookingId, a.price, a.message || '', actor.id);
            return { message: `Counter-offer of ${a.price} sent. The other party sees it live.` };
        },
    },
    accept_offer: {
        roles: ['customer', 'provider'], mutating: true,
        description: "Accept the other party's latest offer on a booking, confirming it and holding the amount in escrow.",
        params: { bookingId: { type: 'string' } }, required: ['bookingId'],
        schema: z.object({ bookingId: oid }),
        summary: (a) => `Accept the current offer on booking ${a.bookingId}`,
        run: async ({ bookingId }, actor) => {
            const bookingService = require('./bookingService');
            await bookingService.updateStatus(bookingId, 'confirmed', actor.id);
            return { message: 'Offer accepted. The booking is confirmed and the amount is held in escrow.' };
        },
    },
    reject_offer: {
        roles: ['customer', 'provider'], mutating: true,
        description: 'Reject the current offer on a booking and close the negotiation.',
        params: { bookingId: { type: 'string' } }, required: ['bookingId'],
        schema: z.object({ bookingId: oid }),
        summary: (a) => `Reject the offer on booking ${a.bookingId}`,
        run: async ({ bookingId }, actor) => {
            const bookingService = require('./bookingService');
            await bookingService.updateStatus(bookingId, 'rejected', actor.id);
            return { message: 'Offer rejected.' };
        },
    },
    cancel_booking: {
        roles: ['customer', 'provider'], mutating: true,
        description: 'Cancel or withdraw a booking. Held escrow is refunded to the customer.',
        params: { bookingId: { type: 'string' } }, required: ['bookingId'],
        schema: z.object({ bookingId: oid }),
        summary: (a) => `Cancel booking ${a.bookingId}`,
        run: async ({ bookingId }, actor) => {
            const bookingService = require('./bookingService');
            await bookingService.updateStatus(bookingId, 'cancelled', actor.id);
            return { message: 'Booking cancelled.' };
        },
    },
    complete_booking: {
        roles: ['customer'], mutating: true,
        description: 'Confirm the event was delivered. This marks the booking complete and releases escrow to the provider.',
        params: { bookingId: { type: 'string' } }, required: ['bookingId'],
        schema: z.object({ bookingId: oid }),
        summary: (a) => `Mark booking ${a.bookingId} complete and release escrow to the provider`,
        run: async ({ bookingId }, actor) => {
            const bookingService = require('./bookingService');
            await bookingService.updateStatus(bookingId, 'completed', actor.id);
            return { message: 'Booking completed. Escrow released to the provider.' };
        },
    },
    raise_dispute: {
        roles: ['customer', 'provider'], mutating: true,
        description: 'Raise a dispute on a confirmed or completed booking, with a reason of at least 10 characters.',
        params: { bookingId: { type: 'string' }, reason: { type: 'string' } }, required: ['bookingId', 'reason'],
        schema: z.object({ bookingId: oid, reason: z.string().min(10).max(1000) }),
        summary: (a) => `Raise a dispute on booking ${a.bookingId}: "${a.reason}"`,
        run: async ({ bookingId, reason }, actor) => {
            const bookingService = require('./bookingService');
            await bookingService.raiseDispute(bookingId, reason, actor.id);
            return { message: 'Dispute raised. An administrator will review it.' };
        },
    },

    /* ---------- Design Studio (customer and vendor on a booking) ---------- */
    view_design: {
        roles: ['customer', 'provider'], mutating: false,
        description: "A booking's design brief, decor concepts (with tiers, palettes, costs) and the latest design messages.",
        params: { bookingId: { type: 'string' } }, required: ['bookingId'],
        schema: z.object({ bookingId: oid }),
        run: async ({ bookingId }, actor) => {
            const d = await require('./designService').getDesign(bookingId, actor.id);
            return { ...d, concepts: d.concepts.map((c) => ({ conceptId: String(c._id), title: c.title, tier: c.tier, totalCost: c.totalCost, selected: c.selected, palette: c.palette, elements: c.elements })), messages: d.messages.slice(-6) };
        },
    },
    update_design_brief: {
        roles: ['customer', 'provider'], mutating: true,
        description: 'Update the shared design brief of a booking: theme, style, colours (hex like #c9a227), decor budget, guest count, notes.',
        params: {
            bookingId: { type: 'string' }, theme: { type: 'string' }, style: { type: 'string' },
            colors: { type: 'array', items: { type: 'string' } }, budget: { type: 'number' }, guestCount: { type: 'number' }, notes: { type: 'string' },
        },
        required: ['bookingId'],
        schema: z.object({
            bookingId: oid, theme: z.string().max(120).optional(), style: z.string().max(120).optional(),
            colors: z.array(z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'use hex colours like #c9a227')).max(8).optional(),
            budget: z.coerce.number().min(0).optional(), guestCount: z.coerce.number().int().min(0).optional(), notes: z.string().max(2000).optional(),
        }),
        summary: (a) => `Update the design brief of booking ${a.bookingId}: ${Object.entries(a).filter(([k]) => k !== 'bookingId').map(([k, v]) => `${k} = ${Array.isArray(v) ? v.join(' ') : v}`).join(', ')}`,
        run: async ({ bookingId, ...brief }, actor) => {
            await require('./designService').updateBrief(bookingId, actor.id, brief);
            return { message: 'Design brief updated. The other party sees it live in the Design Studio.' };
        },
    },
    generate_design_concepts: {
        roles: ['customer', 'provider'], mutating: true,
        description: 'Draft three decor concepts (Essential, Signature, Luxe) for a booking from its design brief, all within its budget.',
        params: { bookingId: { type: 'string' } }, required: ['bookingId'],
        schema: z.object({ bookingId: oid }),
        summary: (a) => `Draft three decor concepts for booking ${a.bookingId}`,
        run: async ({ bookingId }, actor) => {
            const d = await require('./designService').generateConcepts(bookingId, actor.id);
            const fresh = d.concepts.filter((c) => !c.selected).slice(-3);
            return { message: `Drafted ${fresh.length} concepts: ${fresh.map((c) => `${c.tier} "${c.title}" (${c.totalCost})`).join('; ')}. Open the booking's Design Studio to compare and choose one.` };
        },
    },

    /* ---------- passes and reviews ---------- */
    get_pass: {
        roles: ['customer'], mutating: true,
        description: 'Get an entry pass (QR) for an event. Use search_events to find the event id.',
        params: { eventId: { type: 'string' }, ticketType: { type: 'string', enum: ['General', 'VIP'] } }, required: ['eventId'],
        schema: z.object({ eventId: oid, ticketType: z.enum(['General', 'VIP']).optional() }),
        summary: (a) => `Get a ${a.ticketType || 'General'} pass for event ${a.eventId}`,
        run: async (a, actor) => {
            const out = await callHandler(require('../controllers/ticketController').purchaseTicket, actor, a);
            return { message: 'Pass issued. It is in your ticket wallet with its QR code.', ticketNumber: out?.data?.ticketNumber };
        },
    },
    leave_review: {
        roles: ['customer'], mutating: true,
        description: 'Review an event you have a confirmed or completed booking for (rating 1 to 5).',
        params: { eventId: { type: 'string' }, rating: { type: 'number' }, comment: { type: 'string' } }, required: ['eventId', 'rating', 'comment'],
        schema: z.object({ eventId: oid, rating: z.coerce.number().int().min(1).max(5), comment: z.string().min(3).max(1000) }),
        summary: (a) => `Leave a ${a.rating}-star review on event ${a.eventId}: "${a.comment}"`,
        run: async (a, actor) => {
            await callHandler(require('../controllers/reviewController').createReview, actor, a);
            return { message: 'Review posted.' };
        },
    },
    check_in_pass: {
        roles: ['provider', 'admin', 'superadmin'], mutating: true,
        description: 'Check a guest in at the gate using the pass number (for example TKT-...).',
        params: { ticketNumber: { type: 'string' } }, required: ['ticketNumber'],
        schema: z.object({ ticketNumber: z.string().min(4).max(80) }),
        summary: (a) => `Check in pass ${a.ticketNumber}`,
        run: async (a, actor) => {
            const out = await callHandler(require('../controllers/ticketController').scanCheckInTicket, actor, a);
            return { message: out?.message || `Pass ${a.ticketNumber} checked in.` };
        },
    },

    /* ---------- provider listings ---------- */
    update_event: {
        roles: ['provider'], mutating: true,
        description: 'Change one of your events: title, price, date, capacity, location or description. Use my_events for the id.',
        params: {
            eventId: { type: 'string' }, title: { type: 'string' }, price: { type: 'number' }, date: { type: 'string' },
            capacity: { type: 'number' }, location: { type: 'string' }, description: { type: 'string' },
        },
        required: ['eventId'],
        schema: z.object({
            eventId: oid, title: z.string().min(3).max(120).optional(), price: z.coerce.number().positive().optional(),
            date: isoDate.optional(), capacity: z.coerce.number().int().positive().optional(),
            location: z.string().min(2).max(120).optional(), description: z.string().min(10).max(2000).optional(),
        }),
        summary: (a) => `Update event ${a.eventId}: ${Object.entries(a).filter(([k]) => k !== 'eventId').map(([k, v]) => `${k} = ${v}`).join(', ')}`,
        run: async ({ eventId, ...changes }, actor) => {
            const eventService = require('./eventService');
            if (changes.date) changes.date = new Date(changes.date);
            const ev = await eventService.updateEvent(eventId, changes, actor.id);
            return { message: `Event "${ev.title}" updated.` };
        },
    },
    delete_my_event: {
        roles: ['provider'], mutating: true,
        description: 'Delete one of your own events. Events with live bookings cannot be deleted.',
        params: { eventId: { type: 'string' } }, required: ['eventId'],
        schema: z.object({ eventId: oid }),
        summary: (a) => `Delete your event ${a.eventId}`,
        run: async ({ eventId }, actor) => {
            const eventService = require('./eventService');
            await eventService.deleteEvent(eventId, actor.id, actor.role);
            return { message: 'Event deleted.' };
        },
    },
    unblock_date: {
        roles: ['provider'], mutating: true,
        description: 'Remove a blocked date from your availability calendar.',
        params: { date: { type: 'string', description: 'ISO date, e.g. 2026-12-24' } }, required: ['date'],
        schema: z.object({ date: isoDate }),
        summary: (a) => `Unblock ${a.date} on your calendar`,
        run: async ({ date }, actor) => {
            const day = new Date(date);
            const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
            const end = new Date(start.getTime() + 86400000);
            await VendorProfile.updateOne({ userId: actor.id }, { $pull: { blockedDates: { $gte: start, $lt: end } } });
            return { message: `${date} is available again.` };
        },
    },

    /* ---------- changes (need the user's confirmation) ---------- */
    set_user_status: {
        roles: ADMINS, mutating: true,
        description: 'Ban, restrict or reinstate (make active) a user, identified by email.',
        params: { email: { type: 'string' }, status: { type: 'string', enum: ['active', 'restricted', 'banned'] } },
        required: ['email', 'status'],
        schema: z.object({ email: z.string().email(), status: z.enum(['active', 'restricted', 'banned']) }),
        summary: (a) => `${a.status === 'active' ? 'Reinstate' : a.status === 'banned' ? 'Ban' : 'Restrict'} the user ${a.email}`,
        run: async ({ email, status }, actor) => {
            const target = await findUserByEmail(email);
            if (String(target._id) === actor.id) throw new BadRequestError('You cannot change the status of your own account.');
            if (ELEVATED(target.role) && actor.role !== 'superadmin') throw new ForbiddenError('Only a super admin can change an admin-level account.');
            target.status = status;
            await target.save();
            const action = status === 'active' ? 'USER_REINSTATE' : status === 'banned' ? 'USER_BAN' : 'USER_RESTRICT';
            await audit(actor, { action, targetType: 'user', targetId: target._id, severity: status === 'active' ? 'info' : 'critical' });
            return { message: `${target.name} (${target.email}) is now ${status}.` };
        },
    },
    change_user_role: {
        roles: ADMINS, mutating: true,
        description: 'Change the role of a user, identified by email. Only a super admin can grant or remove admin-level roles.',
        params: { email: { type: 'string' }, role: { type: 'string', enum: ALL } },
        required: ['email', 'role'],
        schema: z.object({ email: z.string().email(), role: z.enum(ALL) }),
        summary: (a) => `Change the role of ${a.email} to ${a.role}`,
        run: async ({ email, role }, actor) => {
            const target = await findUserByEmail(email);
            if (String(target._id) === actor.id) throw new BadRequestError('You cannot change your own role.');
            if (actor.role !== 'superadmin' && (ELEVATED(role) || ELEVATED(target.role))) {
                throw new ForbiddenError('Only a super admin can grant or change admin-level roles.');
            }
            target.role = role;
            await target.save();
            await audit(actor, { action: 'USER_ROLE_CHANGED', targetType: 'user', targetId: target._id, severity: 'critical', metadata: { newRole: role } });
            return { message: `${target.name} (${target.email}) is now a ${role}.` };
        },
    },
    create_user: {
        roles: ADMINS, mutating: true,
        description: 'Create a new user account. A one-time temporary password is generated and shown to you once.',
        params: { name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string', enum: ALL } },
        required: ['name', 'email', 'role'],
        schema: z.object({ name: z.string().min(2).max(80), email: z.string().email(), role: z.enum(ALL) }),
        summary: (a) => `Create a ${a.role} account for ${a.name} <${a.email}>`,
        run: async ({ name, email, role }, actor) => {
            if (ELEVATED(role) && actor.role !== 'superadmin') throw new ForbiddenError('Only a super admin can create admin-level accounts.');
            const normalized = email.toLowerCase().trim();
            if (await User.findOne({ email: normalized })) throw new ConflictError('An account with this email already exists.');
            const tempPassword = `${crypto.randomBytes(6).toString('base64url')}-${crypto.randomInt(100, 999)}`;
            const user = await User.create({ name, email: normalized, role, password: await bcrypt.hash(tempPassword, 10), isEmailVerified: true });
            if (role === 'provider') {
                await VendorProfile.create({ userId: user._id, businessName: name, category: 'catering', location: 'Not specified yet' }).catch(() => {});
            }
            await audit(actor, { action: 'USER_CREATED', targetType: 'user', targetId: user._id, severity: ELEVATED(role) ? 'critical' : 'info', metadata: { role } });
            return { message: `Created ${role} account for ${name} (${normalized}).`, temporaryPassword: tempPassword, note: 'Share this password privately; the user should change it after signing in.' };
        },
    },
    resolve_dispute: {
        roles: ADMINS, mutating: true,
        description: 'Rule on a disputed booking: refund the customer or release the money to the provider. Use list_disputes to get the booking id.',
        params: { bookingId: { type: 'string' }, resolution: { type: 'string', enum: ['refunded_customer', 'released_vendor'] } },
        required: ['bookingId', 'resolution'],
        schema: z.object({ bookingId: oid, resolution: z.enum(['refunded_customer', 'released_vendor']) }),
        summary: (a) => `Resolve dispute on booking ${a.bookingId}: ${a.resolution === 'refunded_customer' ? 'refund the customer' : 'release the money to the provider'}`,
        run: async ({ bookingId, resolution }, actor) => {
            const { resolveDispute } = require('./disputeService');
            await resolveDispute({ bookingId, resolution, actorId: actor.id, ipAddress: actor.ip });
            return { message: `Dispute on booking ${bookingId} resolved (${resolution.replace('_', ' ')}).` };
        },
    },
    delete_event: {
        roles: ['superadmin'], mutating: true,
        description: 'Delete an event by id. Events with live bookings cannot be deleted.',
        params: { eventId: { type: 'string' } }, required: ['eventId'],
        schema: z.object({ eventId: oid }),
        summary: (a) => `Delete event ${a.eventId}`,
        run: async ({ eventId }, actor) => {
            const eventService = require('./eventService');
            await eventService.deleteEvent(eventId, actor.id, actor.role);
            await audit(actor, { action: 'EVENT_DELETED', targetType: 'event', targetId: eventId, severity: 'warning' });
            return { message: `Event ${eventId} deleted.` };
        },
    },
    create_event: {
        roles: ['provider'], mutating: true,
        description: 'Publish a new event listing that customers can make offers on.',
        params: {
            title: { type: 'string' }, category: { type: 'string', enum: EVENT_CATEGORIES }, date: { type: 'string', description: 'ISO date, e.g. 2026-12-20' },
            price: { type: 'number' }, capacity: { type: 'number' }, location: { type: 'string' }, description: { type: 'string' },
        },
        required: ['title', 'category', 'date', 'price', 'capacity', 'location', 'description'],
        schema: z.object({
            title: z.string().min(3).max(120), category: z.enum(EVENT_CATEGORIES), date: isoDate,
            price: z.coerce.number().positive(), capacity: z.coerce.number().int().positive(),
            location: z.string().min(2).max(120), description: z.string().min(10).max(2000),
        }),
        summary: (a) => `Publish "${a.title}" (${a.category}) on ${a.date} in ${a.location}, price ${a.price}, capacity ${a.capacity}`,
        run: async (a, actor) => {
            const eventService = require('./eventService');
            const ev = await eventService.createEvent({ ...a, date: new Date(a.date) }, actor.id);
            return { message: `Event "${ev.title}" published.`, eventId: String(ev._id) };
        },
    },
    create_service: {
        roles: ['provider'], mutating: true,
        description: 'Add a service package to your vendor profile.',
        params: {
            title: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' },
            eventType: { type: 'string', description: 'Kind of event the package is for, e.g. wedding, birthday, corporate' },
        },
        required: ['title', 'price'],
        schema: z.object({
            title: z.string().min(3).max(120), price: z.coerce.number().positive(),
            description: z.string().max(1000).optional(), eventType: z.string().min(2).max(40).optional(),
        }),
        summary: (a) => `Add service package "${a.title}" at ${a.price}`,
        run: async (a, actor) => {
            const profile = await VendorProfile.findOne({ userId: actor.id });
            if (!profile) throw new BadRequestError('Create your vendor profile first.');
            const service = await Service.create({
                vendorId: profile._id, title: a.title, price: a.price,
                description: a.description || a.title, eventType: a.eventType || 'general',
            });
            return { message: `Service "${service.title}" added.` };
        },
    },
    block_date: {
        roles: ['provider'], mutating: true,
        description: 'Block a date on your availability calendar so customers cannot book it.',
        params: { date: { type: 'string', description: 'ISO date, e.g. 2026-12-24' } }, required: ['date'],
        schema: z.object({ date: isoDate }),
        summary: (a) => `Block ${a.date} on your calendar`,
        run: async ({ date }, actor) => {
            await VendorProfile.findOneAndUpdate({ userId: actor.id }, { $addToSet: { blockedDates: new Date(date) } }, { upsert: true });
            return { message: `${date} is now blocked.` };
        },
    },
    make_offer: {
        roles: ['customer'], mutating: true,
        description: 'Book an event: sends an opening price offer to its vendor ("book", "reserve" and "make an offer" all mean this). If the user gives no price, leave offerPrice out and the asking price is used. Use search_events to find the event id.',
        params: { eventId: { type: 'string' }, offerPrice: { type: 'number' }, message: { type: 'string' } },
        required: ['eventId'],
        schema: z.object({ eventId: oid, offerPrice: z.coerce.number().positive().optional(), message: z.string().max(500).optional() }),
        summary: (a) => `Book event ${a.eventId} with an offer of ${a.offerPrice ?? 'the asking price'}${a.message ? ` and the note "${a.message}"` : ''}`,
        run: async (a, actor) => {
            const bookingService = require('./bookingService');
            const offerPrice = a.offerPrice ?? (await Event.findById(a.eventId).select('price').lean())?.price;
            if (!offerPrice) throw new BadRequestError('Event not found.');
            const booking = await bookingService.createBooking({ ...a, offerPrice }, actor.id);
            return { message: 'Offer sent. The provider has been notified.', bookingId: String(booking._id) };
        },
    },
};

/* ------------------------------------------------------------------ helpers */

const actionsFor = (role) => Object.entries(ACTIONS).filter(([, a]) => a.roles.includes(role));

const toolsFor = (role) => actionsFor(role).map(([name, a]) => ({
    type: 'function',
    function: {
        name,
        description: a.description + (a.mutating ? ' (The user will be asked to confirm before this runs.)' : ''),
        parameters: { type: 'object', properties: a.params, required: a.required || [] },
    },
}));

function systemPrompt(actor) {
    const can = actionsFor(actor.role).map(([n, a]) => `- ${n}: ${a.description}`).join('\n');
    return [
        `You are Smartie, the AI assistant of SmartEvents, an event services marketplace.`,
        `You are helping ${actor.name}, whose role is ${actor.role}. Today is ${new Date().toISOString().slice(0, 10)}.`,
        `You can carry out tasks by calling these tools:`,
        can,
        `Rules:`,
        `- Use a tool whenever the user asks you to look something up or to do something you have a tool for.`,
        `- Look things up first when you need an id instead of guessing: my_bookings for bookings, my_events for your events,`,
        `  search_events for events, list_disputes for disputes, find_users for accounts. Refer to things by name when you reply, not by id.`,
        `- When the user names a booking or event in words (for example "the Royal Palm offer"), find it first, then act on it.`,
        `- Never invent emails, ids, prices or dates. If a required detail is missing, ask one short question.`,
        `- For tools that change data, call the tool; the user will see a confirmation card. Do not claim the change is done.`,
        `- If the user asks for something your role cannot do, say so plainly.`,
        `- Booking or making an offer on an event is only possible from a customer (Organizer) account. If a vendor, admin or super admin asks to book, explain that and suggest signing in with their Organizer account.`,
        `- Keep answers short and practical. Plain text, no JSON.`,
    ].join('\n');
}

/** Replaces raw ids in a confirmation summary with names the user recognises. */
async function humanise(summary, args, actor) {
    let out = summary;
    try {
        if (args.bookingId) {
            const b = await Booking.findById(args.bookingId).populate('eventId', 'title').populate('customerId', 'name').populate('vendorId', 'name').lean();
            if (b) {
                const other = String(b.customerId?._id) === actor.id ? b.vendorId?.name : b.customerId?.name;
                out = out.replace(`booking ${args.bookingId}`, `the "${b.eventId?.title || 'booking'}" booking${other ? ` with ${other}` : ''}`);
            }
        }
        if (args.eventId) {
            const e = await Event.findById(args.eventId).select('title').lean();
            if (e) out = out.replace(new RegExp(`(your )?event ${args.eventId}`), `"${e.title}"`);
        }
    } catch { /* keep the plain summary */ }
    return out;
}

function validate(name, args, role) {
    const action = ACTIONS[name];
    if (!action) throw new BadRequestError(`Unknown action: ${name}`);
    if (!action.roles.includes(role)) throw new ForbiddenError('Your role is not allowed to perform this action.');
    const parsed = action.schema.safeParse(args || {});
    if (!parsed.success) {
        const issue = parsed.error.issues?.[0];
        throw new BadRequestError(`Invalid details for ${name}: ${issue ? `${issue.path.join('.')} ${issue.message}` : 'check the values'}.`);
    }
    return { action, args: parsed.data };
}

/* ------------------------------------------------------------------ entry points */

/**
 * One conversational turn. Runs read-only tools itself; stops and returns a
 * proposal as soon as the model asks for a change.
 */
async function chat(history, actor) {
    const messages = [
        { role: 'system', content: systemPrompt(actor) },
        ...history.slice(-MAX_HISTORY).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 4000) })),
    ];
    const tools = toolsFor(actor.role);
    const lookups = [];

    for (let step = 0; step < MAX_STEPS; step++) {
        const res = await complete({ messages, tools, tool_choice: 'auto', temperature: 0.2, max_tokens: 700 });
        const msg = res.choices?.[0]?.message || {};
        const calls = msg.tool_calls || [];
        if (!calls.length) return { reply: (msg.content || '').trim() || 'Done.', lookups };

        messages.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
        for (const call of calls) {
            const name = call.function?.name;
            let args = {};
            try { args = JSON.parse(call.function?.arguments || '{}'); } catch { /* treated as invalid below */ }

            let checked;
            try {
                checked = validate(name, args, actor.role);
            } catch (err) {
                messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: err.message }) });
                continue;
            }

            if (checked.action.mutating) {
                return {
                    reply: (msg.content || '').trim() || 'Please confirm this action.',
                    pendingAction: { name, args: checked.args, summary: await humanise(checked.action.summary(checked.args), checked.args, actor) },
                    lookups,
                };
            }

            let result;
            try {
                result = await checked.action.run(checked.args, actor);
                lookups.push(name);
            } catch (err) {
                result = { error: err.message };
            }
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) });
        }
    }
    return { reply: 'I looked that up but could not finish in a few steps. Please ask in a more specific way.', lookups };
}

/** Runs a confirmed change. Arguments and role are checked again here. */
async function execute(name, args, actor) {
    const { action, args: clean } = validate(name, args, actor.role);
    if (!action.mutating) throw new BadRequestError('Only changes need confirming.');
    return action.run(clean, actor);
}

module.exports = { chat, execute, ACTIONS, actionsFor };
