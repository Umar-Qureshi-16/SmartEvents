const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Event = require('../models/Event');

exports.recalculateTrustScore = async (vendorId) => {
    try {
        let score = 100; // Baseline

        // 1. Completed bookings: +3 points
        const completedCount = await Booking.countDocuments({ vendorId, status: 'completed' });
        score += completedCount * 3;

        // 2. Cancellation by provider after confirmation: -5 points
        const cancellationCount = await Booking.countDocuments({ vendorId, status: 'cancelled', cancelledBy: vendorId });
        score -= cancellationCount * 5;

        // 3. Dispute resolved against provider: -10 points
        const disputeLostCount = await Booking.countDocuments({ vendorId, disputeOutcome: 'refunded_customer' });
        score -= disputeLostCount * 10;

        // 4. No-show: -8 points
        const noShowCount = await Booking.countDocuments({ vendorId, status: 'no_show' });
        score -= noShowCount * 8;

        // 5. Reviews: 5-star is +2, 4-star is +1
        const events = await Event.find({ createdBy: vendorId });
        const eventIds = events.map(e => e._id);
        
        const reviews = await Review.find({ event: { $in: eventIds } });
        reviews.forEach(review => {
            if (review.rating === 5) {
                score += 2;
            } else if (review.rating === 4) {
                score += 1;
            }
        });

        // Clamp 0-100
        score = Math.max(0, Math.min(100, score));

        await User.findByIdAndUpdate(vendorId, { trustScore: score });
        return score;
    } catch (err) {
        console.error('Error recalculating trust score:', err);
    }
};
