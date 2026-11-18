/**
 * Vendor ratings come from the reviews customers leave on the vendor's events
 * (a review needs a confirmed or completed booking). Stars are 1 to 5, 5 best.
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Review = require('../models/Review');
const VendorProfile = require('../models/VendorProfile');

const round1 = (n) => Math.round(n * 10) / 10;

/** Map of vendor userId -> { rating, reviewsCount } for many vendors at once. */
async function ratingsFor(vendorUserIds) {
    const ids = vendorUserIds.map(String);
    const events = await Event.find({ createdBy: { $in: ids } }).select('_id createdBy').lean();
    const owner = new Map(events.map((e) => [String(e._id), String(e.createdBy)]));
    const rows = events.length
        ? await Review.aggregate([
            { $match: { event: { $in: events.map((e) => e._id) } } },
            { $group: { _id: '$event', sum: { $sum: '$rating' }, n: { $sum: 1 } } },
        ])
        : [];
    const out = new Map(ids.map((id) => [id, { sum: 0, n: 0 }]));
    for (const r of rows) {
        const v = out.get(owner.get(String(r._id)));
        if (v) { v.sum += r.sum; v.n += r.n; }
    }
    return new Map([...out].map(([id, { sum, n }]) => [id, { rating: n ? round1(sum / n) : 0, reviewsCount: n }]));
}

/** Resolves a vendor profile id or user id to the vendor's user id. */
async function vendorUserId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const profile = await VendorProfile.findOne({ $or: [{ _id: id }, { userId: id }] }).select('userId').lean();
    return profile ? String(profile.userId) : String(id);
}

/** Summary (average, count, 1-5 distribution) and recent reviews for one vendor. */
async function vendorReviews(id, limit = 30) {
    const uid = await vendorUserId(id);
    if (!uid) return null;
    const events = await Event.find({ createdBy: uid }).select('_id title').lean();
    const reviews = await Review.find({ event: { $in: events.map((e) => e._id) } })
        .populate('user', 'name')
        .populate('event', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    const all = await Review.find({ event: { $in: events.map((e) => e._id) } }).select('rating').lean();
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.forEach((r) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
    const count = all.length;
    const average = count ? round1(all.reduce((t, r) => t + r.rating, 0) / count) : 0;
    return {
        vendorUserId: uid,
        summary: { average, count, distribution },
        reviews: reviews.map((r) => ({
            _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
            user: { name: r.user?.name || 'Customer' },
            event: r.event ? { _id: r.event._id, title: r.event.title } : null,
        })),
    };
}

module.exports = { ratingsFor, vendorReviews };
