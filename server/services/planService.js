/**
 * Event plans: the organizer's end-to-end checklist, from booking the venue to
 * the final review, plus the vendor packages that can fulfil each task.
 */
const mongoose = require('mongoose');
const EventPlan = require('../models/EventPlan');
const { CATEGORIES } = require('../models/EventPlan');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const { complete } = require('./groqClient');
const { BadRequestError, NotFoundError } = require('../utils/AppError');

const DAY = 86400000;

/** Which vendor field can do a task, from its wording. */
function categoryFor(text = '') {
    const t = text.toLowerCase();
    if (/venue|hall|marquee|banquet|location/.test(t)) return 'venue';
    if (/cater|food|menu|dinner|meal|cake/.test(t)) return 'catering';
    if (/photo|video|film|camera/.test(t)) return 'photography';
    if (/music|dj|band|sound|audio|entertain/.test(t)) return 'music';
    if (/makeup|bridal|beauty|mehndi artist|salon/.test(t)) return 'makeup';
    if (/decor|flower|floral|stage|lighting|logistic|seating/.test(t)) return 'decoration';
    return null;
}

/** A sensible plan when the AI is unavailable; also the shape the AI must follow. */
function templateTasks(eventType) {
    return [
        { title: 'Venue booking', category: 'venue', daysBefore: 180, description: `Shortlist and book the venue for the ${eventType.toLowerCase()}.` },
        { title: 'Catering', category: 'catering', daysBefore: 120, description: 'Choose a caterer, agree the menu and the guest count.' },
        { title: 'Decoration and logistics', category: 'decoration', daysBefore: 90, description: 'Agree the theme, stage, seating, lighting and flowers.' },
        { title: 'Photography', category: 'photography', daysBefore: 75, description: 'Book a photographer or videographer and agree the coverage.' },
        { title: 'Music and sound', category: 'music', daysBefore: 60, description: 'Book a DJ or band and confirm the sound system.' },
        { title: 'Invitations', category: null, daysBefore: 45, description: 'Finalise the guest list and send the invitations.' },
        { title: 'Final review', category: null, daysBefore: 7, description: 'Confirm every vendor, timings, payments and the run sheet.' },
    ];
}

async function aiTasks({ title, eventType, date, location, budget }) {
    const daysLeft = Math.max(1, Math.round((new Date(date) - Date.now()) / DAY));
    const prompt = `Plan the tasks for a ${eventType} called "${title}" on ${new Date(date).toISOString().slice(0, 10)}${location ? ` in ${location}` : ''}${budget ? ` with a total budget of ${budget}` : ''}. It is ${daysLeft} days away.
Give 6 to 9 tasks from booking the venue to the final review, each with the vendor field that can do it.
Allowed fields: ${CATEGORIES.join(', ')} or null when the organizer does it themselves (invitations, guest list, final review).
daysBefore must be at most ${daysLeft}.
Reply with JSON only: {"tasks":[{"title":"string","description":"string","category":"venue|catering|decoration|photography|music|makeup|null","daysBefore":number}]}`;
    const res = await complete({ messages: [{ role: 'user', content: prompt }], temperature: 0.3, response_format: { type: 'json_object' } });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    const list = Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray) || [];
    return list;
}

function normalise(tasks, date) {
    const event = new Date(date).getTime();
    const daysLeft = Math.max(0, Math.round((event - Date.now()) / DAY));
    return tasks
        .filter((t) => t && (t.title || t.milestone))
        .slice(0, 12)
        .map((t) => {
            const title = String(t.title || t.milestone).slice(0, 120);
            const description = String(t.description || '').slice(0, 600);
            const category = CATEGORIES.includes(t.category) ? t.category : categoryFor(`${title} ${description}`);
            const daysBefore = Math.min(daysLeft, Math.max(0, Math.round(Number(t.daysBefore) || 0)));
            return { title, description, category, daysBefore, dueDate: new Date(event - daysBefore * DAY) };
        })
        .sort((a, b) => b.daysBefore - a.daysBefore);
}

/**
 * Ticks off a task when the organizer already has a confirmed (or completed)
 * booking with a vendor in that task's field. Returns true if anything changed.
 */
async function syncWithBookings(plan) {
    const bookings = await Booking.find({ customerId: plan.owner, status: { $in: ['confirmed', 'completed'] } })
        .select('vendorId status').lean();
    if (!bookings.length) return false;
    const profiles = await VendorProfile.find({ userId: { $in: bookings.map((b) => b.vendorId) } }).select('userId category').lean();
    const catOf = new Map(profiles.map((p) => [String(p.userId), p.category]));
    const used = new Set(plan.tasks.filter((t) => t.bookingId).map((t) => String(t.bookingId)));
    let changed = false;
    for (const task of plan.tasks) {
        if (task.status === 'done' || !task.category) continue;
        const match = bookings.find((b) => catOf.get(String(b.vendorId)) === task.category && !used.has(String(b._id)));
        if (match) {
            task.status = 'done'; task.doneAt = new Date(); task.bookingId = match._id;
            used.add(String(match._id));
            changed = true;
        }
    }
    return changed;
}

async function createPlan(ownerId, input) {
    let { title, eventType, date, location, budget, bookingId, quick } = input;
    if (bookingId) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new BadRequestError('Invalid booking id.');
        const existing = await EventPlan.findOne({ owner: ownerId, sourceBooking: bookingId });
        if (existing) return getPlan(ownerId, existing._id);
        const booking = await Booking.findOne({ _id: bookingId, customerId: ownerId }).populate('eventId', 'title').lean();
        if (!booking) throw new NotFoundError('Booking not found.');
        title = title || booking.eventId?.title || booking.eventDetails?.eventType;
        eventType = eventType || booking.eventDetails?.eventType;
        date = date || booking.eventDetails?.date;
        location = location || booking.eventDetails?.location;
    }
    if (!title || !date || Number.isNaN(Date.parse(date))) throw new BadRequestError('A plan needs a title and an event date.');
    eventType = eventType || 'Event';

    let raw = [];
    // quick: use the standard task list straight away (e.g. when booking a bundle), no AI round trip.
    if (!quick) {
        try { raw = await aiTasks({ title, eventType, date, location, budget }); } catch (err) { console.warn('[plan] AI unavailable:', err.message); }
    }
    let tasks = normalise(raw, date);
    if (tasks.length < 3) tasks = normalise(templateTasks(eventType), date);

    const plan = await EventPlan.create({
        owner: ownerId, title, eventType, date, location: location || '', budget, sourceBooking: bookingId || undefined, tasks,
    });
    return getPlan(ownerId, plan._id);
}

async function listPlans(ownerId) {
    const plans = await EventPlan.find({ owner: ownerId }).sort({ date: 1 });
    for (const p of plans) if (await syncWithBookings(p)) await p.save();
    return plans.map((p) => p.toObject());
}

async function getPlan(ownerId, planId) {
    if (!mongoose.Types.ObjectId.isValid(planId)) throw new BadRequestError('Invalid plan id.');
    const plan = await EventPlan.findOne({ _id: planId, owner: ownerId });
    if (!plan) throw new NotFoundError('Plan not found.');
    if (await syncWithBookings(plan)) await plan.save();
    return plan.toObject();
}

/** Finds a task by id or, for Smartie, by (part of) its title. */
function findTask(plan, ref) {
    if (mongoose.Types.ObjectId.isValid(ref)) {
        const byId = plan.tasks.id(ref);
        if (byId) return byId;
    }
    const q = String(ref).toLowerCase();
    return plan.tasks.find((t) => t.title.toLowerCase() === q) || plan.tasks.find((t) => t.title.toLowerCase().includes(q));
}

async function setTaskStatus(ownerId, planId, taskRef, status) {
    if (!['todo', 'done'].includes(status)) throw new BadRequestError('Status must be todo or done.');
    const plan = await EventPlan.findOne({ _id: planId, owner: ownerId });
    if (!plan) throw new NotFoundError('Plan not found.');
    const task = findTask(plan, taskRef);
    if (!task) throw new NotFoundError('Task not found in this plan.');
    task.status = status;
    task.doneAt = status === 'done' ? new Date() : undefined;
    if (status === 'todo') task.bookingId = undefined;
    await plan.save();
    return plan.toObject();
}

async function addTask(ownerId, planId, { title, description, category, daysBefore }) {
    const plan = await EventPlan.findOne({ _id: planId, owner: ownerId });
    if (!plan) throw new NotFoundError('Plan not found.');
    const [task] = normalise([{ title, description, category, daysBefore }], plan.date);
    if (!task) throw new BadRequestError('A task needs a title.');
    plan.tasks.push(task);
    plan.tasks.sort((a, b) => b.daysBefore - a.daysBefore);
    await plan.save();
    return plan.toObject();
}

async function deletePlan(ownerId, planId) {
    const res = await EventPlan.deleteOne({ _id: planId, owner: ownerId });
    if (!res.deletedCount) throw new NotFoundError('Plan not found.');
}

/**
 * Packages vendors offer in one field (venue, catering, ...), cheapest first,
 * with the vendor's name, city and star rating. Only active vendors.
 */
async function packages({ category, maxPrice, location, limit = 24 } = {}) {
    if (category && !CATEGORIES.includes(category)) throw new BadRequestError(`Category must be one of ${CATEGORIES.join(', ')}.`);
    const profileFilter = {};
    if (location) profileFilter.location = new RegExp(String(location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const profiles = await VendorProfile.find(profileFilter).select('userId businessName category location').lean();
    const active = new Set((await User.find({ _id: { $in: profiles.map((p) => p.userId) }, status: { $nin: ['banned', 'restricted'] } }).select('_id').lean()).map((u) => String(u._id)));
    const visible = profiles.filter((p) => active.has(String(p.userId)));
    if (!visible.length) return [];
    const filter = { vendorId: { $in: visible.map((p) => p._id) }, isAvailable: { $ne: false } };
    // A package's own field wins; otherwise it takes the vendor's profile category.
    if (category) {
        filter.$or = [
            { category },
            { category: { $in: [null, undefined] }, vendorId: { $in: visible.filter((p) => p.category === category).map((p) => p._id) } },
        ];
    }
    if (maxPrice) filter.price = { $lte: Number(maxPrice) };
    const services = await Service.find(filter).sort({ price: 1 }).limit(Math.min(Number(limit) || 24, 60)).lean();
    const byId = new Map(visible.map((p) => [String(p._id), p]));
    const ratings = await require('./reviewStats').ratingsFor([...new Set(services.map((s) => String(byId.get(String(s.vendorId)).userId)))]);
    return services.map((s) => {
        const p = byId.get(String(s.vendorId));
        const r = ratings.get(String(p.userId)) || { rating: 0, reviewsCount: 0 };
        return {
            _id: s._id, title: s.title, price: s.price, description: s.description, eventType: s.eventType, image: s.images?.[0] || null,
            category: s.category || p.category,
            vendor: { userId: p.userId, profileId: p._id, businessName: p.businessName, category: p.category, location: p.location, rating: r.rating, reviewsCount: r.reviewsCount },
        };
    });
}

/** Sends an opening offer on a vendor package, dated for the plan's event. */
async function bookPackage(ownerId, { serviceId, planId, offerPrice, message }) {
    if (!mongoose.Types.ObjectId.isValid(serviceId)) throw new BadRequestError('Invalid package id.');
    const service = await Service.findById(serviceId).lean();
    if (!service) throw new NotFoundError('Package not found.');
    const profile = await VendorProfile.findById(service.vendorId).select('userId location category').lean();
    if (!profile) throw new NotFoundError('Vendor not found.');
    const plan = planId ? await EventPlan.findOne({ _id: planId, owner: ownerId }).lean() : null;
    const eventDetails = {
        eventType: plan?.eventType || service.eventType || 'Event',
        date: plan?.date || new Date(Date.now() + 30 * DAY),
        location: plan?.location || profile.location || 'To be agreed',
        message: message || `Package: ${service.title}${plan ? ` for ${plan.title}` : ''}`,
    };
    return require('./bookingService').createBooking({
        vendorId: String(profile.userId), serviceId: String(service._id), offerPrice: offerPrice || service.price, eventDetails, message: eventDetails.message,
    }, ownerId);
}

module.exports = { createPlan, listPlans, getPlan, setTaskStatus, addTask, deletePlan, packages, bookPackage, categoryFor, CATEGORIES };
