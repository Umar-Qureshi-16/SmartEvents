const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errors');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/AppError');

/**
 * Records a governance action. Previously only superadmin actions were
 * audited, so admin bans, role changes, and dispute rulings left no trace.
 */
const audit = async (req, { action, targetType, targetId, severity = 'info', metadata }) => {
    try {
        await AuditLog.create({
            action,
            actor: req.user.id,
            targetType,
            targetId,
            severity,
            metadata,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    } catch (err) {
        // Never fail the operation because the audit write failed.
        console.error('Audit log write failed:', err.message);
    }
};

exports.getUsers = asyncHandler(async (req, res) => {
    const { role, status, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users });
});

exports.getStats = asyncHandler(async (req, res) => {
    const [totalUsers, totalEvents, totalBookings, confirmedBookings, revenueAgg] = await Promise.all([
        User.countDocuments(),
        Event.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({ status: { $in: ['confirmed', 'completed'] } }),
        Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$offerPrice' } } }
        ])
    ]);

    res.json({
        success: true,
        data: {
            totalUsers,
            totalEvents,
            totalBookings,
            confirmedBookings,
            totalRevenue: revenueAgg[0]?.total || 0
        }
    });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!['customer', 'provider', 'admin', 'superadmin'].includes(role)) {
        throw new BadRequestError('Invalid role.');
    }
    if (String(req.params.id) === String(req.user.id)) {
        throw new BadRequestError('You cannot change your own role.');
    }
    const target = await User.findById(req.params.id).select('role');
    if (!target) throw new NotFoundError('User not found.');

    // Only a superadmin may grant elevated roles or touch elevated accounts.
    // Otherwise any admin could demote the superadmin or mint more admins.
    const elevated = (r) => r === 'admin' || r === 'superadmin';
    if (req.user.role !== 'superadmin' && (elevated(role) || elevated(target.role))) {
        throw new ForbiddenError('Only a superadmin can grant or change admin-level roles.');
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');

    await audit(req, {
        action: 'USER_ROLE_CHANGED',
        targetType: 'user',
        targetId: user._id,
        severity: 'critical',
        metadata: { newRole: role }
    });

    res.json({ success: true, data: user, message: `${user.name} is now a ${role}.` });
});

exports.banUser = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'active' | 'restricted' | 'banned'

    if (!['active', 'restricted', 'banned'].includes(status)) {
        throw new BadRequestError("status must be one of: active, restricted, banned.");
    }
    if (req.params.id === req.user.id) {
        throw new BadRequestError('You cannot change your own account status.');
    }

    const target = await User.findById(req.params.id).select('role');
    if (!target) throw new NotFoundError('User not found.');
    if (req.user.role !== 'superadmin' && (target.role === 'admin' || target.role === 'superadmin')) {
        throw new ForbiddenError('Only a superadmin can restrict or ban admin accounts.');
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');

    await audit(req, {
        action: `USER_${status.toUpperCase()}`,
        targetType: 'user',
        targetId: user._id,
        severity: status === 'active' ? 'info' : 'critical'
    });

    res.json({ success: true, data: user, message: `${user.name} is now ${status}.` });
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await AuditLog.find()
        .populate('actor', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    res.json({ success: true, data: logs });
});

exports.verifyVendor = asyncHandler(async (req, res) => {
    const { verified } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { 'businessDetails.verified': Boolean(verified) },
        { new: true }
    ).select('-password');
    if (!user) throw new NotFoundError('User not found.');

    await audit(req, {
        action: verified ? 'VENDOR_VERIFIED' : 'VENDOR_UNVERIFIED',
        targetType: 'user',
        targetId: user._id,
        severity: 'warning'
    });

    res.json({
        success: true,
        data: user,
        message: verified ? 'Vendor verified successfully.' : 'Vendor verification revoked.'
    });
});

exports.resolveDispute = asyncHandler(async (req, res) => {
    const { resolution } = req.body;

    if (!['refunded_customer', 'released_vendor'].includes(resolution)) {
        throw new BadRequestError('resolution must be refunded_customer or released_vendor.');
    }

    const booking = await Booking.findById(req.params.id);
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

    const { recalculateTrustScore } = require('../services/trustScoreService');
    await recalculateTrustScore(booking.vendorId);

    // Tell both parties how it was decided.
    const notificationService = require('../services/notificationService');
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

    await audit(req, {
        action: 'DISPUTE_RESOLVED',
        targetType: 'booking',
        targetId: booking._id,
        severity: 'critical',
        metadata: { resolution }
    });

    res.json({ success: true, data: booking, message: 'Dispute resolved successfully.' });
});
