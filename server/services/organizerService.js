/**
 * Organizer (customer) profiles: the organizer's own full view, and a shorter
 * view for vendors deciding whether to accept an offer.
 */
const mongoose = require('mongoose');
const { z } = require('zod');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Ticket = require('../models/Ticket');
const EventPlan = require('../models/EventPlan');
const VendorProfile = require('../models/VendorProfile');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/AppError');

const ACTIVE = ['pending', 'negotiating'];
const BOOKED = ['confirmed', 'completed'];
const url = z.string().trim().url().max(500).or(z.literal(''));

const updateSchema = z.object({
    name: z.string().trim().min(2).max(60).optional(),
    bio: z.string().trim().max(600).optional(),
    city: z.string().trim().max(80).optional(),
    avatar: url.optional(),
    coverImage: url.optional(),
    interests: z.array(z.string().trim().min(2).max(40)).max(10).optional(),
});

const titleOf = (b) => b.eventId?.title || (b.serviceId?.title ? `${b.serviceId.title} package` : b.eventDetails?.eventType) || 'Booking';

async function counts(uid) {
    const [byStatus, reviews, tickets, plans, user] = await Promise.all([
        Booking.aggregate([
            { $match: { customerId: new mongoose.Types.ObjectId(String(uid)) } },
            { $group: { _id: '$status', n: { $sum: 1 }, spent: { $sum: '$offerPrice' } } },
        ]),
        Review.find({ user: uid }).select('rating').lean(),
        Ticket.countDocuments({ attendee: uid }),
        EventPlan.countDocuments({ owner: uid }),
        User.findById(uid).select('favorites').lean(),
    ]);
    const n = (statuses) => byStatus.filter((r) => statuses.includes(r._id)).reduce((t, r) => t + r.n, 0);
    const spent = byStatus.filter((r) => BOOKED.includes(r._id)).reduce((t, r) => t + r.spent, 0);
    return {
        bookings: n(byStatus.map((r) => r._id)),
        active: n(ACTIVE),
        confirmed: n(['confirmed']),
        completed: n(['completed']),
        cancelled: n(['cancelled', 'rejected']),
        disputed: n(['disputed']),
        spent,
        reviews: reviews.length,
        averageGiven: reviews.length ? Math.round((reviews.reduce((t, r) => t + r.rating, 0) / reviews.length) * 10) / 10 : 0,
        tickets,
        plans,
        following: (user?.favorites || []).length,
    };
}

/** Everything the organizer sees on their own profile page. */
async function myProfile(uid) {
    const user = await User.findById(uid).select('name email role profile createdAt favorites').lean();
    if (!user) throw new NotFoundError('Account not found.');
    if (user.role !== 'customer') throw new ForbiddenError('Organizer profiles are for organizer accounts.');

    const [stats, bookings, reviews, plans, following] = await Promise.all([
        counts(uid),
        Booking.find({ customerId: uid }).populate('eventId', 'title image category').populate('serviceId', 'title')
            .populate('vendorId', 'name').sort({ 'eventDetails.date': 1 }).lean(),
        Review.find({ user: uid }).populate({ path: 'event', select: 'title createdBy', populate: { path: 'createdBy', select: 'name' } })
            .sort({ createdAt: -1 }).limit(50).lean(),
        EventPlan.find({ owner: uid }).sort({ date: 1 }).lean(),
        VendorProfile.find({ userId: { $in: user.favorites || [] } }).select('userId businessName category location portfolioImages tagline').lean(),
    ]);
    const now = Date.now();
    const vendorIds = [...new Set(reviews.map((r) => String(r.event?.createdBy?._id || '')).filter(Boolean))];
    const vendorNames = new Map((await VendorProfile.find({ userId: { $in: vendorIds } }).select('userId businessName').lean()).map((p) => [String(p.userId), p.businessName]));
    const ratings = await require('./reviewStats').ratingsFor(following.map((p) => p.userId));

    return {
        user: { _id: user._id, name: user.name, email: user.email, memberSince: user.createdAt, ...(user.profile || {}) },
        stats,
        upcoming: bookings
            .filter((b) => b.status === 'confirmed' && b.eventDetails?.date && new Date(b.eventDetails.date).getTime() >= now - 86400000)
            .map((b) => ({ _id: b._id, title: titleOf(b), date: b.eventDetails.date, location: b.eventDetails.location, vendor: b.vendorId?.name, vendorId: b.vendorId?._id, image: b.eventId?.image || null, price: b.offerPrice })),
        spending: bookings.filter((b) => BOOKED.includes(b.status)).map((b) => ({
            _id: b._id, title: titleOf(b), vendor: b.vendorId?.name, date: b.eventDetails?.date, price: b.offerPrice, status: b.status, escrow: b.escrow?.status || 'none',
        })),
        reviews: reviews.map((r) => ({
            _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
            event: r.event ? { _id: r.event._id, title: r.event.title } : null,
            vendor: r.event?.createdBy ? { _id: r.event.createdBy._id, name: vendorNames.get(String(r.event.createdBy._id)) || r.event.createdBy.name } : null,
        })),
        plans: plans.map((p) => ({ _id: p._id, title: p.title, date: p.date, done: p.tasks.filter((t) => t.status === 'done').length, total: p.tasks.length })),
        following: following.map((p) => ({
            userId: p.userId, businessName: p.businessName, category: p.category, location: p.location, tagline: p.tagline,
            image: p.portfolioImages?.[0] || null, ...(ratings.get(String(p.userId)) || { rating: 0, reviewsCount: 0 }),
        })),
    };
}

async function updateMyProfile(uid, body) {
    const parsed = updateSchema.safeParse(body || {});
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new BadRequestError(`${issue.path.join('.') || 'Profile'}: ${issue.message}`);
    }
    const { name, ...profile } = parsed.data;
    const $set = {};
    if (name) $set.name = name;
    for (const [k, v] of Object.entries(profile)) $set[`profile.${k}`] = v;
    const user = await User.findOneAndUpdate({ _id: uid, role: 'customer' }, { $set }, { new: true });
    if (!user) throw new ForbiddenError('Organizer profiles are for organizer accounts.');
    return myProfile(uid);
}

/**
 * What a vendor sees about an organizer: reliability, not contact details.
 * Allowed for the organizer, admins, and vendors who have a booking with them.
 */
async function organizerCard(viewer, organizerId) {
    if (!mongoose.Types.ObjectId.isValid(organizerId)) throw new NotFoundError('Organizer not found.');
    const user = await User.findOne({ _id: organizerId, role: 'customer' }).select('name profile createdAt').lean();
    if (!user) throw new NotFoundError('Organizer not found.');
    const isSelf = String(viewer.id) === String(organizerId);
    const isAdmin = ['admin', 'superadmin'].includes(viewer.role);
    if (!isSelf && !isAdmin) {
        const related = viewer.role === 'provider' && await Booking.exists({ customerId: organizerId, vendorId: viewer.id });
        if (!related) throw new ForbiddenError('You can see an organizer once they have sent you an offer.');
    }
    const stats = await counts(organizerId);
    const reviews = await Review.find({ user: organizerId }).populate('event', 'title').sort({ createdAt: -1 }).limit(10).lean();
    const concluded = stats.completed + stats.cancelled;
    return {
        user: {
            _id: user._id, name: user.name, memberSince: user.createdAt,
            city: user.profile?.city, bio: user.profile?.bio, avatar: user.profile?.avatar, coverImage: user.profile?.coverImage, interests: user.profile?.interests || [],
        },
        stats: {
            bookings: stats.bookings, completed: stats.completed, cancelled: stats.cancelled, disputed: stats.disputed,
            reviews: stats.reviews, averageGiven: stats.averageGiven,
            completionRate: concluded ? Math.round((stats.completed / concluded) * 100) : null,
        },
        reviews: reviews.map((r) => ({ _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, event: r.event?.title })),
    };
}

module.exports = { myProfile, updateMyProfile, organizerCard };
