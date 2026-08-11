const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const bookingService = require('../services/bookingService');
const { asyncHandler } = require('../middleware/errors');

exports.createRequest = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'customer') return res.status(403).json({ success: false, message: 'Only customers can request quotes' });
    const { vendorId, serviceId, eventType, date, location, budget, message } = req.body;
    const offerPrice = req.body.offerPrice || req.body.price || 0;

    const booking = await bookingService.createBooking({
        vendorId,
        serviceId,
        eventDetails: { eventType, date, location, budget, message },
        offerPrice
    }, req.user.id);

    res.status(201).json({ success: true, message: 'Booking request / Lead sent to provider', booking });
});

exports.updateRequestStatus = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'provider') return res.status(403).json({ success: false, message: 'Provider access required' });
    const { status } = req.body;
    
    const booking = await bookingService.updateStatus(req.params.id, status, req.user.id);

    res.json({ success: true, message: 'Status updated', booking });
});

exports.getRequests = asyncHandler(async (req, res, next) => {
    let requests;
    if (req.user.role === 'customer') {
        requests = await Booking.find({ customerId: req.user.id }).populate('vendorId', 'name email');
    } else if (req.user.role === 'provider') {
        requests = await Booking.find({ vendorId: req.user.id }).populate('customerId', 'name email');
    } else {
        requests = await Booking.find().populate('customerId vendorId');
    }
    res.json(requests || []);
});
