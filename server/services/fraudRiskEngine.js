const User = require('../models/User');
const Booking = require('../models/Booking');

/**
 * FraudRiskEngine
 * Centralized logic for scoring platform entities based on behavioral patterns.
 */
class FraudRiskEngine {
    /**
     * Calculate fraud score for a given user.
     * Scale: 0 (Safe) to 100 (Critical Risk)
     */
    static async calculateUserRisk(userId) {
        let score = 0;
        const user = await User.findById(userId);
        if (!user) return 0;

        // Pattern 1: Rapid Account Creation / IP Overlap (Simplified)
        // In production, we'd check against an IP blacklist or velocity tracking.

        // Pattern 2: Cancellation Velocity
        // The Booking schema uses customerId / vendorId — querying `userId`
        // or `providerId` matched nothing, so every score used to come back 0.
        const partyFilter = user.role === 'provider'
            ? { vendorId: userId }
            : { customerId: userId };

        const recentCancellations = await Booking.countDocuments({
            ...partyFilter,
            status: 'cancelled',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });
        if (recentCancellations > 5) score += 30;
        if (recentCancellations > 10) score += 30;

        // Pattern 3: Dispute Frequency (Provider perspective)
        if (user.role === 'provider') {
            const disputes = await Booking.countDocuments({
                vendorId: userId,
                status: 'disputed'
            });
            if (disputes > 3) score += 20;
            if (disputes > 10) score += 30;

            const lostDisputes = await Booking.countDocuments({
                vendorId: userId,
                disputeOutcome: 'refunded_customer'
            });
            if (lostDisputes > 2) score += 20;
        }

        // Pattern 4: No-show history
        const noShows = await Booking.countDocuments({ ...partyFilter, status: 'no_show' });
        if (noShows > 2) score += 15;

        // Pattern 5: Account Flags
        if (user.status === 'restricted') score += 40;

        return Math.min(score, 100);
    }

    /**
     * Get Trust Classification
     */
    static getClassification(score) {
        if (score < 20) return 'LOW';
        if (score < 50) return 'MODERATE';
        if (score < 80) return 'HIGH';
        return 'CRITICAL';
    }
}

module.exports = FraudRiskEngine;
