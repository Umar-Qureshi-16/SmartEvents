const User = require('../models/User');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const FraudRiskEngine = require('../services/fraudRiskEngine');
const socketManager = require('../services/socketManager');

/**
 * SuperAdminController
 * High-level orchestration for SmartEvents Enterprise ecosystem.
 */
class SuperAdminController {
    /**
     * Platform Overview Metrics
     */
    static async getPlatformStats(req, res) {
        try {
            const [totalUsers, activeBookings, totalRevenue, totalDisputes] = await Promise.all([
                User.countDocuments(),
                Booking.countDocuments({ status: { $in: ['pending', 'negotiating', 'confirmed'] } }),
                Booking.aggregate([
                    { $match: { status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$offerPrice' } } }
                ]),
                Booking.countDocuments({ status: 'disputed' })
            ]);

            res.json({
                totalUsers,
                activeBookings,
                revenue: totalRevenue[0]?.total || 0,
                disputes: totalDisputes,
                health: 'Healthy'
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * Live Pulse Feed
     */
    static async getAuditLogs(req, res) {
        try {
            const logs = await AuditLog.find()
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('actor', 'name email');
            res.json(logs);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * Fraud Detection & Scoring
     */
    static async getFraudRisks(req, res) {
        try {
            const providers = await User.find({ role: 'provider' }).limit(20);
            const risks = await Promise.all(providers.map(async (p) => {
                const score = await FraudRiskEngine.calculateUserRisk(p._id);
                return {
                    userId: p._id,
                    name: p.name,
                    email: p.email,
                    score,
                    classification: FraudRiskEngine.getClassification(score)
                };
            }));
            res.json(risks);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    /**
     * Emergency Governance
     */
    static async restrictUser(req, res) {
        try {
            const { userId, action } = req.body;
            const status = action === 'ban' ? 'banned' : 'restricted';
            await User.findByIdAndUpdate(userId, { status });

            // Log action
            await new AuditLog({
                action: `USER_${action.toUpperCase()}`,
                actor: req.user.id,
                targetType: 'user',
                targetId: userId,
                severity: 'critical'
            }).save();

            socketManager.emitToUser(userId, 'account_status_change', { status });
            res.json({ message: `User successfully ${status}` });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = SuperAdminController;
