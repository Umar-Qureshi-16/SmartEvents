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
        const totalBookingsCount = await Booking.countDocuments({ vendorId: req.user.id, status: 'cancelled' });

        res.json({ leads, activeBookings, analytics: { totalEarnings, totalBookingsCount, profileViews: Math.floor(Math.random() * 500) } }); // mock profile views
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
        
        if (!profile) {
            return res.json({
                success: true,
                isMock: true,
                profile: {
                    businessName: id === 'fv-1' ? 'Grand Hyatt Ballroom' : id === 'fv-2' ? 'Gourmet Royale Catering' : id === 'fv-3' ? 'Aura Light & Sound AV' : 'Premium Vendor Co.',
                    category: id === 'fv-1' ? 'venue' : id === 'fv-2' ? 'catering' : id === 'fv-3' ? 'music' : 'photography',
                    location: 'Chicago, IL',
                    rating: 4.9,
                    reviewsCount: 142,
                    description: 'A premium provider of high-quality services with a solid track record of successful events.',
                    portfolioImages: [
                        'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',
                        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80'
                    ],
                    userId: { name: 'Verified Vendor Owner', email: 'owner@smartevents.com', trustScore: 98 }
                },
                services: [
                    { _id: 'mock-s1', title: 'Premium Service Package', price: 1500, description: 'Complete end-to-end setup including professional crew, logistics, and premium deliverables.' }
                ]
            });
        }

        const services = await Service.find({ vendorId: profile._id });
        res.json({ success: true, profile, services });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching vendor profile', error: error.message });
    }
};
