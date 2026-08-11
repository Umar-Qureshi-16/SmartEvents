const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalEvents = await Event.countDocuments();
        const totalBookings = await Booking.countDocuments();
        res.json({ success: true, data: { totalUsers, totalEvents, totalBookings } });
    } catch (error) {
        next(error);
    }
};

exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        res.json({ success: true, data: user, message: 'User role updated.' });
    } catch (error) {
        next(error);
    }
};

exports.banUser = async (req, res, next) => {
    try {
        const { status } = req.body; // 'active', 'restricted', 'banned'
        const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, data: user, message: `User status set to ${status}.` });
    } catch (error) {
        next(error);
    }
};

exports.getAuditLogs = async (req, res, next) => {
    try {
        const logs = await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 });
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

exports.verifyVendor = async (req, res, next) => {
    try {
        const { verified } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 'businessDetails.verified': verified },
            { new: true }
        );
        res.json({ success: true, data: user, message: verified ? 'Vendor verified successfully.' : 'Vendor verification revoked.' });
    } catch (error) {
        next(error);
    }
};

exports.resolveDispute = async (req, res, next) => {
    try {
        const { resolution } = req.body;
        if (!['refunded_customer', 'released_vendor'].includes(resolution)) {
            return res.status(400).json({ success: false, message: 'Invalid resolution outcome' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.status = resolution === 'refunded_customer' ? 'cancelled' : 'completed';
        booking.disputeOutcome = resolution;
        await booking.save();

        const { recalculateTrustScore } = require('../services/trustScoreService');
        await recalculateTrustScore(booking.vendorId);

        res.json({ success: true, data: booking, message: 'Dispute resolved successfully' });
    } catch (error) {
        next(error);
    }
};
