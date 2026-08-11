const User = require('../models/User');
const Event = require('../models/Event');
const Bid = require('../models/Bid');
const Payment = require('../models/Payment');

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalEvents = await Event.countDocuments();
        const totalBids = await Bid.countDocuments();
        const payments = await Payment.find({ status: { $in: ['paid', 'released'] } });
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalEvents,
                totalBids,
                totalRevenue,
                activeDisputes: 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching admin stats' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ success: true, data: user, message: `User status changed to ${user.isActive ? 'Active' : 'Suspended'}` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
