const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { BadRequestError, NotFoundError } = require('../utils/AppError');

/**
 * Rules on a disputed booking. Shared by the admin panel and the AI assistant
 * so both apply exactly the same escrow, trust-score and audit rules.
 */
async function resolveDispute({ bookingId, resolution, actorId, ipAddress, userAgent }) {
    if (!['refunded_customer', 'released_vendor'].includes(resolution)) {
        throw new BadRequestError('resolution must be refunded_customer or released_vendor.');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found.');
    if (booking.status !== 'disputed') {
        throw new BadRequestError('This booking is not under dispute.');
    }

    booking.status = resolution === 'refunded_customer' ? 'cancelled' : 'completed';
    booking.disputeOutcome = resolution;
    if (booking.escrow?.status === 'held') {
        booking.escrow.status = resolution === 'refunded_customer' ? 'refunded' : 'released';
        booking.escrow.settledAt = new Date();
    }
    if (resolution === 'refunded_customer') booking.cancelledBy = booking.vendorId;
    await booking.save();

    const { recalculateTrustScore } = require('./trustScoreService');
    await recalculateTrustScore(booking.vendorId);

    // Tell both parties how it was decided.
    const notificationService = require('./notificationService');
    const outcomeText = resolution === 'refunded_customer'
        ? 'resolved in the customer\'s favour — the booking has been cancelled and refunded.'
        : 'resolved in the provider\'s favour — the booking has been marked complete.';

    await Promise.allSettled([booking.customerId, booking.vendorId].map(recipient =>
        notificationService.createNotification({
            recipient,
            title: 'Dispute Resolved',
            message: `Your dispute has been ${outcomeText}`,
            type: 'booking',
            relatedId: booking._id,
            priority: 'high'
        })
    ));

    try {
        await AuditLog.create({
            action: 'DISPUTE_RESOLVED',
            actor: actorId,
            targetType: 'booking',
            targetId: booking._id,
            severity: 'critical',
            metadata: { resolution },
            ipAddress,
            userAgent
        });
    } catch (err) {
        console.error('Audit log write failed:', err.message);
    }

    return booking;
}

module.exports = { resolveDispute };
