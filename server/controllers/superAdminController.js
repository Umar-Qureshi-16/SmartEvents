const os = require('os');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const FraudRiskEngine = require('../services/fraudRiskEngine');
const socketManager = require('../services/socketManager');
const { asyncHandler } = require('../middleware/errors');
const { BadRequestError, NotFoundError } = require('../utils/AppError');

/**
 * SuperAdminController
 * Platform-wide governance, analytics, and risk oversight.
 */
class SuperAdminController {
    /** Headline platform metrics. */
    static getPlatformStats = asyncHandler(async (req, res) => {
        const [totalUsers, providers, customers, activeBookings, revenueAgg, disputes, bannedUsers] =
            await Promise.all([
                User.countDocuments(),
                User.countDocuments({ role: 'provider' }),
                User.countDocuments({ role: 'customer' }),
                Booking.countDocuments({ status: { $in: ['pending', 'negotiating', 'confirmed'] } }),
                Booking.aggregate([
                    { $match: { status: { $in: ['confirmed', 'completed'] } } },
                    { $group: { _id: null, total: { $sum: '$offerPrice' }, count: { $sum: 1 } } }
                ]),
                Booking.countDocuments({ status: 'disputed' }),
                User.countDocuments({ status: { $in: ['banned', 'restricted'] } })
            ]);

        const revenue = revenueAgg[0]?.total || 0;
        const closedDeals = revenueAgg[0]?.count || 0;

        res.json({
            success: true,
            data: {
                totalUsers,
                providers,
                customers,
                activeBookings,
                revenue,
                closedDeals,
                averageDealValue: closedDeals ? Math.round(revenue / closedDeals) : 0,
                disputes,
                bannedUsers,
                health: 'Healthy'
            }
        });
    });

    /**
     * Monthly revenue and booking volume for the last 6 months.
     * Replaces the hardcoded array the analytics widget used to ship with.
     */
    static getRevenueSeries = asyncHandler(async (req, res) => {
        const since = new Date();
        since.setMonth(since.getMonth() - 5);
        since.setDate(1);
        since.setHours(0, 0, 0, 0);

        const rows = await Booking.aggregate([
            { $match: { status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
                    revenue: { $sum: '$offerPrice' },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { '_id.y': 1, '_id.m': 1 } }
        ]);

        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const byKey = new Map(rows.map(r => [`${r._id.y}-${r._id.m}`, r]));

        // Emit a continuous 6-month series so the chart has no gaps.
        const series = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(since);
            d.setMonth(since.getMonth() + i);
            const hit = byKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`);
            series.push({
                name: MONTHS[d.getMonth()],
                revenue: hit?.revenue || 0,
                bookings: hit?.bookings || 0
            });
        }

        res.json({ success: true, data: series });
    });

    /** Recent audit trail. */
    static getAuditLogs = asyncHandler(async (req, res) => {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const logs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('actor', 'name email')
            .lean();
        res.json({ success: true, data: logs });
    });

    /** Behavioural risk score for every provider. */
    static getFraudRisks = asyncHandler(async (req, res) => {
        const providers = await User.find({ role: 'provider' }).limit(50).lean();

        const risks = await Promise.all(providers.map(async (p) => {
            const score = await FraudRiskEngine.calculateUserRisk(p._id);
            return {
                userId: p._id,
                name: p.name,
                email: p.email,
                status: p.status,
                trustScore: p.trustScore,
                score,
                classification: FraudRiskEngine.getClassification(score)
            };
        }));

        // Highest risk first — that is what an operator wants to act on.
        risks.sort((a, b) => b.score - a.score);
        res.json({ success: true, data: risks });
    });

    /** Providers with their trust and volume, for the oversight panel. */
    static getProviders = asyncHandler(async (req, res) => {
        const providers = await User.find({ role: 'provider' })
            .select('name email role trustScore status analytics createdAt')
            .sort({ trustScore: -1 })
            .limit(50)
            .lean();
        res.json({ success: true, data: providers });
    });

    /** Open disputes awaiting mediation. */
    static getDisputes = asyncHandler(async (req, res) => {
        const disputes = await Booking.find({ status: 'disputed' })
            .populate('customerId', 'name email')
            .populate('vendorId', 'name email trustScore')
            .populate('eventId', 'title')
            .sort({ updatedAt: -1 })
            .lean();
        res.json({ success: true, data: disputes });
    });

    /** Ban or restrict an account, with an audit entry and a live push. */
    static restrictUser = asyncHandler(async (req, res) => {
        const { userId, action } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new BadRequestError('A valid userId is required.');
        }
        if (!['ban', 'restrict', 'reinstate'].includes(action)) {
            throw new BadRequestError("action must be one of: ban, restrict, reinstate.");
        }

        const status = action === 'ban' ? 'banned' : action === 'restrict' ? 'restricted' : 'active';

        const target = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('name email status');
        if (!target) throw new NotFoundError('User not found.');

        await AuditLog.create({
            action: `USER_${action.toUpperCase()}`,
            actor: req.user.id,
            targetType: 'user',
            targetId: userId,
            severity: action === 'reinstate' ? 'info' : 'critical'
        });

        socketManager.emitToUser(userId, 'account_status_change', { status });

        res.json({ success: true, data: target, message: `${target.name} is now ${status}.` });
    });
}

module.exports = SuperAdminController;
