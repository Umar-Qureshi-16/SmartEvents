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
            const rows = await Booking.find({ [key]: actor.id }).populate('eventId', 'title').populate(actor.role === 'provider' ? 'customerId' : 'vendorId', 'name').sort({ createdAt: -1 }).limit(15).lean();
            return rows.map((b) => ({ bookingId: String(b._id), event: b.eventId?.title, status: b.status, price: b.offerPrice, with: (b.customerId?.name || b.vendorId?.name) }));
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
        params: { title: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' } },
        required: ['title', 'price'],
        schema: z.object({ title: z.string().min(3).max(120), price: z.coerce.number().positive(), description: z.string().max(1000).optional() }),
        summary: (a) => `Add service package "${a.title}" at ${a.price}`,
        run: async (a, actor) => {
            const profile = await VendorProfile.findOne({ userId: actor.id });
            if (!profile) throw new BadRequestError('Create your vendor profile first.');
            const service = await Service.create({ ...a, vendorId: profile._id });
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
        description: 'Make an opening price offer on an event. Use search_events to find the event id.',
        params: { eventId: { type: 'string' }, offerPrice: { type: 'number' }, message: { type: 'string' } },
        required: ['eventId', 'offerPrice'],
        schema: z.object({ eventId: oid, offerPrice: z.coerce.number().positive(), message: z.string().max(500).optional() }),
        summary: (a) => `Offer ${a.offerPrice} on event ${a.eventId}${a.message ? ` with the note "${a.message}"` : ''}`,
        run: async (a, actor) => {
            const bookingService = require('./bookingService');
            const booking = await bookingService.createBooking(a, actor.id);
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
        `- Look things up first when you need an id (for example list_disputes or search_events) instead of guessing.`,
        `- Never invent emails, ids, prices or dates. If a required detail is missing, ask one short question.`,
        `- For tools that change data, call the tool; the user will see a confirmation card. Do not claim the change is done.`,
        `- If the user asks for something your role cannot do, say so plainly.`,
        `- Keep answers short and practical. Plain text, no JSON.`,
    ].join('\n');
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
                    pendingAction: { name, args: checked.args, summary: checked.action.summary(checked.args) },
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
