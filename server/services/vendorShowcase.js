/**
 * The details behind the numbers on a vendor's public profile: who follows
 * them, which events they have delivered, and how the trust score is made up.
 * Customer identities are shortened ("Ali K.") because these lists are public.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Event = require('../models/Event');
const VendorProfile = require('../models/VendorProfile');
const { NotFoundError } = require('../utils/AppError');

const shortName = (name = '') => {
    const [first, ...rest] = String(name).trim().split(/\s+/);
    const last = rest.pop();
    return [first || 'Customer', last ? `${last[0].toUpperCase()}.` : ''].filter(Boolean).join(' ');
};

/** Accepts a vendor profile id or the vendor's user id; returns the user id. */
async function resolveVendor(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Vendor not found.');
    const profile = await VendorProfile.findOne({ $or: [{ _id: id }, { userId: id }] }).select('userId').lean();
    if (!profile) throw new NotFoundError('Vendor not found.');
    return profile.userId;
}

async function followers(id) {
    const uid = await resolveVendor(id);
    const users = await User.find({ favorites: uid }).select('name createdAt').sort({ createdAt: -1 }).limit(200).lean();
    return users.map((u) => ({ _id: u._id, name: shortName(u.name), memberSince: u.createdAt }));
}

async function delivered(id) {
    const uid = await resolveVendor(id);
    const bookings = await Booking.find({ vendorId: uid, status: 'completed' })
        .populate('eventId', 'title image category')
        .populate('serviceId', 'title')
        .sort({ 'eventDetails.date': -1 })
        .limit(100)
        .lean();
    const eventIds = bookings.map((b) => b.eventId?._id).filter(Boolean);
    const reviews = await Review.find({ event: { $in: eventIds } }).select('event user rating').lean();
    return bookings.map((b) => {
        const review = reviews.find((r) => String(r.event) === String(b.eventId?._id) && String(r.user) === String(b.customerId));
        return {
            _id: b._id,
            title: b.eventId?.title || (b.serviceId?.title ? `${b.serviceId.title} package` : b.eventDetails?.eventType) || 'Event',
            eventType: b.eventDetails?.eventType || b.eventId?.category || 'Event',
            date: b.eventDetails?.date,
            location: b.eventDetails?.location,
            image: b.eventId?.image || null,
            rating: review?.rating || null,
        };
    });
}

/** Same formula as trustScoreService, with every part shown. */
async function trust(id) {
    const uid = await resolveVendor(id);
    const [completed, cancelled, noShows, lostDisputes] = await Promise.all([
        Booking.countDocuments({ vendorId: uid, status: 'completed' }),
        Booking.countDocuments({ vendorId: uid, status: 'cancelled', cancelledBy: uid }),
        Booking.countDocuments({ vendorId: uid, status: 'no_show' }),
        Booking.countDocuments({ vendorId: uid, disputeOutcome: 'refunded_customer' }),
    ]);
    const eventIds = await Event.find({ createdBy: uid }).distinct('_id');
    const ratings = await Review.find({ event: { $in: eventIds } }).select('rating').lean();
    const avgRating = ratings.length ? ratings.reduce((t, r) => t + r.rating, 0) / ratings.length : 0;
    const concluded = completed + cancelled + noShows;
    const MIN = 3;
    const parts = {
        completed, cancelledByVendor: cancelled, noShows, lostDisputes, concluded,
        reviews: ratings.length, averageRating: Math.round(avgRating * 10) / 10,
        minimumForScore: MIN,
    };
    if (concluded < MIN) {
        return { score: 70, baseline: true, ...parts, explanation: `Every vendor starts at a neutral 70 until ${MIN} bookings are concluded (${concluded} so far).` };
    }
    const completionRate = completed / concluded;
    const ratingScore = ratings.length ? (avgRating - 1) / 4 : 0.5;
    const fromCompletion = Math.round(55 * completionRate);
    const fromRating = Math.round(35 * ratingScore);
    const penalties = lostDisputes * 8 + noShows * 5;
    const score = Math.max(0, Math.min(100, Math.round(100 * (0.55 * completionRate + 0.35 * ratingScore + 0.1) - penalties)));
    return {
        score, baseline: false, ...parts,
        completionRate: Math.round(completionRate * 100),
        points: { completion: fromCompletion, rating: fromRating, base: 10, penalties },
        explanation: 'Completion (up to 55) + customer rating (up to 35) + 10 base, minus 8 per dispute lost and 5 per no-show.',
    };
}

module.exports = { followers, delivered, trust, shortName };
