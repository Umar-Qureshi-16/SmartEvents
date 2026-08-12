const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const bookingService = require('../services/bookingService');
const { asyncHandler } = require('../middleware/errors');

exports.createBooking = asyncHandler(async (req, res, next) => {
    const booking = await bookingService.createBooking(req.body, req.user.id);
    res.status(201).json({ success: true, data: booking });
});

exports.getMyBookings = asyncHandler(async (req, res, next) => {
    const bookings = await bookingService.getMyBookings(req.user.id);
    res.json({ success: true, data: bookings });
});

exports.getOrganizerBookings = asyncHandler(async (req, res, next) => {
    const bookings = await bookingService.getOrganizerBookings(req.user.id);
    res.json({ success: true, data: bookings });
});

exports.getVendorDashboard = asyncHandler(async (req, res, next) => {
    const vendorId = req.user.id;

    // $match in an aggregation pipeline does NOT auto-cast strings to
    // ObjectIds the way find() does, so this has to be cast explicitly.
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const [leads, activeBookings, totalEarnings, totalBookingsCount] = await Promise.all([
        Booking.find({ vendorId, status: { $in: ['pending', 'negotiating'] } })
            .populate('customerId', 'name email trustScore')
            .populate('eventId', 'title')
            .sort({ updatedAt: -1 }),

        Booking.find({ vendorId, status: 'confirmed' })
            .populate('customerId', 'name')
            .populate('eventId', 'title')
            .limit(5),

        Booking.aggregate([
            { $match: { vendorId: vendorObjectId, status: { $in: ['confirmed', 'completed'] } } },
            { $group: { _id: null, total: { $sum: '$offerPrice' } } }
        ]),

        Booking.countDocuments({ vendorId, status: { $in: ['confirmed', 'completed'] } })
    ]);

    res.json({
        success: true,
        data: {
            leads,
            activeBookings,
            analytics: {
                totalEarnings: totalEarnings[0]?.total || 0,
                totalBookingsCount
            }
        }
    });
});

exports.getBookingById = asyncHandler(async (req, res, next) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user.id);
    res.json({ success: true, data: booking });
});

exports.negotiate = asyncHandler(async (req, res, next) => {
    const { price, message } = req.body;
    const booking = await bookingService.negotiate(req.params.id, price, message, req.user.id);
    res.json({ success: true, data: booking, message: 'Counter-offer submitted.' });
});

exports.acceptBooking = asyncHandler(async (req, res, next) => {
    const booking = await bookingService.updateStatus(req.params.id, 'confirmed', req.user.id);
    res.json({ success: true, data: booking, message: 'Booking confirmed.' });
});

exports.rejectBooking = asyncHandler(async (req, res, next) => {
    const booking = await bookingService.updateStatus(req.params.id, 'rejected', req.user.id);
    res.json({ success: true, data: booking, message: 'Booking rejected.' });
});

exports.raiseDispute = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;
    const booking = await bookingService.raiseDispute(req.params.id, reason, req.user.id);
    res.json({ success: true, data: booking, message: 'Dispute raised. An administrator will review it.' });
});

exports.cancelBooking = asyncHandler(async (req, res, next) => {
    const booking = await bookingService.updateStatus(req.params.id, 'cancelled', req.user.id);
    res.json({ success: true, data: booking, message: 'Booking cancelled.' });
});
