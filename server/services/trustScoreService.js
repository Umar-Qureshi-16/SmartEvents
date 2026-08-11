const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Event = require('../models/Event');

// Neutral starting score for providers without enough history to judge.
const BASELINE_SCORE = 70;
const MIN_BOOKINGS_FOR_RATING = 3;

// Weights sum to 1.0 across the three positive signals.
const W_COMPLETION = 0.55;
const W_RATING = 0.35;
const W_BASE = 0.10;

// Penalties applied after the weighted score.
const PENALTY_LOST_DISPUTE = 8;
const PENALTY_NO_SHOW = 5;

/**
 * Recalculates a provider's trust score as a weighted ratio rather than a
 * running tally.
 *
 * The previous implementation started at 100 and mostly added points, then
 * clamped at 100 — so a provider with 40 completed bookings and one with zero
 * both scored 100, and the metric could not discriminate between them.
 *
 * Score = 100 x (0.55 x completionRate + 0.35 x ratingScore + 0.10)
 *         - 8 per dispute lost
 *         - 5 per no-show
 * clamped to 0..100.
 */
exports.recalculateTrustScore = async (vendorId) => {
    try {
        const [completed, cancelled, noShows, lostDisputes] = await Promise.all([
            Booking.countDocuments({ vendorId, status: 'completed' }),
            Booking.countDocuments({ vendorId, status: 'cancelled', cancelledBy: vendorId }),
            Booking.countDocuments({ vendorId, status: 'no_show' }),
            Booking.countDocuments({ vendorId, disputeOutcome: 'refunded_customer' })
        ]);

        const totalConcluded = completed + cancelled + noShows;

        // Not enough history to draw a conclusion — stay neutral rather than
        // implying either excellence or risk.
        if (totalConcluded < MIN_BOOKINGS_FOR_RATING) {
            await User.findByIdAndUpdate(vendorId, { trustScore: BASELINE_SCORE });
            return BASELINE_SCORE;
        }

        const completionRate = completed / totalConcluded;

        // Average review rating across every event this provider owns.
        const eventIds = await Event.find({ createdBy: vendorId }).distinct('_id');
        const reviews = await Review.find({ event: { $in: eventIds } }).select('rating').lean();

        const avgRating = reviews.length
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        // Map 1..5 onto 0..1; unrated providers sit neutral at 0.5 rather than
        // being punished for having no reviews yet.
        const ratingScore = reviews.length ? (avgRating - 1) / 4 : 0.5;

        let score = 100 * (W_COMPLETION * completionRate + W_RATING * ratingScore + W_BASE);
        score -= lostDisputes * PENALTY_LOST_DISPUTE;
        score -= noShows * PENALTY_NO_SHOW;

        score = Math.round(Math.max(0, Math.min(100, score)));

        await User.findByIdAndUpdate(vendorId, {
            trustScore: score,
            'analytics.completedEvents': completed,
            'analytics.averageRating': reviews.length ? Number(avgRating.toFixed(2)) : 0,
            'analytics.cancellationRate': totalConcluded
                ? Number((cancelled / totalConcluded).toFixed(3))
                : 0
        });

        return score;
    } catch (err) {
        console.error('Error recalculating trust score:', err);
        return null;
    }
};
