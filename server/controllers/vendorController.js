const VendorProfile = require('../models/VendorProfile');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

exports.getProfile = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const profile = await VendorProfile.findOne({ userId: req.user.id });
        res.json(profile || {});
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const profileData = { ...req.body, userId: req.user.id };
        const profile = await VendorProfile.findOneAndUpdate({ userId: req.user.id }, profileData, { new: true, upsert: true });
        res.json({ message: 'Profile updated successfully', profile });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

exports.createService = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const profile = await VendorProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(400).json({ message: 'Please create a vendor profile first' });
        const service = new Service({ ...req.body, vendorId: profile._id });
        await service.save();
        res.status(201).json({ message: 'Service created', service });
    } catch (error) {
        res.status(500).json({ message: 'Error creating service', error: error.message });
    }
};

exports.matchServices = async (req, res) => {
    try {
        const { eventType, maxBudget, location } = req.query;
        let filter = {};
        if (eventType) filter.eventType = new RegExp(eventType, 'i');
        if (maxBudget) filter.price = { $lte: Number(maxBudget) };

        let services = await Service.find(filter).populate('vendorId');

        if (location) {
            services = services.filter(s => s.vendorId && s.vendorId.location && s.vendorId.location.toLowerCase().includes(location.toLowerCase()));
        }
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Error matching services', error: error.message });
    }
};

exports.getDashboard = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const leads = await Booking.find({ vendorId: req.user.id, status: 'pending' }).populate('customerId', 'name email');
        const activeBookings = await Booking.find({ vendorId: req.user.id, status: 'confirmed' }).populate('customerId', 'name email');
        const profile = await VendorProfile.findOne({ userId: req.user.id });

        const totalEarnings = profile?.earnings || 0;
        // Previously counted status 'cancelled', which reported the opposite
        // of what the label claims.
        const totalBookingsCount = await Booking.countDocuments({
            vendorId: req.user.id,
            status: { $in: ['confirmed', 'completed'] }
        });

        res.json({ leads, activeBookings, analytics: { totalEarnings, totalBookingsCount } });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
    }
};

exports.getBlockedDates = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const profile = await VendorProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(400).json({ message: 'Please create a vendor profile first' });
        res.json({ success: true, data: profile.blockedDates || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching blocked dates', error: error.message });
    }
};

exports.blockDate = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const { date } = req.body;
        if (!date) return res.status(400).json({ message: 'Date is required' });

        const profile = await VendorProfile.findOneAndUpdate(
            { userId: req.user.id },
            { $addToSet: { blockedDates: new Date(date) } },
            { new: true, upsert: true }
        );
        res.json({ success: true, message: 'Date blocked successfully', data: profile.blockedDates });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error blocking date', error: error.message });
    }
};

exports.unblockDate = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const { date } = req.body;
        if (!date) return res.status(400).json({ message: 'Date is required' });

        const profile = await VendorProfile.findOneAndUpdate(
            { userId: req.user.id },
            { $pull: { blockedDates: new Date(date) } },
            { new: true }
        );
        res.json({ success: true, message: 'Date unblocked successfully', data: profile ? profile.blockedDates : [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error unblocking date', error: error.message });
    }
};

exports.getServices = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const profile = await VendorProfile.findOne({ userId: req.user.id });
        if (!profile) return res.status(400).json({ message: 'Please create a vendor profile first' });
        const services = await Service.find({ vendorId: profile._id });
        res.json({ success: true, data: services });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching services', error: error.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const { id } = req.params;
        const service = await Service.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ success: true, message: 'Service package updated successfully', service });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating service', error: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const { id } = req.params;
        await Service.findByIdAndDelete(id);
        res.json({ success: true, message: 'Service package deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting service', error: error.message });
    }
};

/**
 * Public vendor directory.
 *
 * No listing endpoint existed — only single-profile lookup — which is why the
 * marketplace page shipped with four hardcoded vendors instead of real data.
 */
exports.listPublicVendors = async (req, res) => {
    try {
        const { category, location, search, page = 1, limit = 12 } = req.query;

        const query = {};
        if (category && category !== 'All') query.category = category;
        if (location) query.location = { $regex: location, $options: 'i' };
        if (search) {
            query.$or = [
                { businessName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [profiles, total] = await Promise.all([
            VendorProfile.find(query)
                .populate('userId', 'name email trustScore status businessDetails analytics')
                .skip(skip)
                .limit(Number(limit))
                .sort({ rating: -1, createdAt: -1 })
                .lean(),
            VendorProfile.countDocuments(query),
        ]);

        // Suspended providers should not appear in a public directory.
        const visible = profiles.filter(p => p.userId && p.userId.status === 'active');

        // Attach a starting price from each provider's cheapest package.
        const withPricing = await Promise.all(visible.map(async (p) => {
            const cheapest = await Service.findOne({ vendorId: p._id })
                .sort({ price: 1 })
                .select('price')
                .lean();
            return {
                ...p,
                startingPrice: cheapest?.price ?? null,
                trustScore: p.userId?.trustScore ?? null,
                completedEvents: p.userId?.analytics?.completedEvents ?? 0,
                averageRating: p.userId?.analytics?.averageRating ?? 0,
                verified: p.userId?.businessDetails?.verified ?? false,
            };
        }));

        res.json({
            success: true,
            data: withPricing,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.max(1, Math.ceil(total / Number(limit))),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error listing vendors', error: error.message });
    }
};

exports.getPublicProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const mongoose = require('mongoose');
        let profile = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            profile = await VendorProfile.findOne({
                $or: [{ _id: id }, { userId: id }]
            }).populate('userId', 'name email trustScore');
        }
        
        // Previously this fabricated a vendor ("Grand Hyatt Ballroom", stock
        // images, a 4.9 rating with 142 invented reviews) whenever a profile
        // was missing. Demo data belongs in scripts/seedData.js, not in a
        // production response path.
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Vendor profile not found' });
        }

        const services = await Service.find({ vendorId: profile._id });
        res.json({ success: true, profile, services });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching vendor profile', error: error.message });
    }
};
