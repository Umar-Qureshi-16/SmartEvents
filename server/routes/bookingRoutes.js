const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

const { validate, bookingCreateSchema, negotiateSchema, disputeSchema } = require('../utils/validation');

router.post('/', verifyToken, authorize('customer'), validate(bookingCreateSchema), bookingController.createBooking);
router.get('/my', verifyToken, authorize('customer'), bookingController.getMyBookings);
router.get('/organizer/dashboard', verifyToken, authorize('provider', 'admin', 'superadmin'), bookingController.getVendorDashboard);
router.get('/organizer', verifyToken, authorize('provider', 'admin', 'superadmin'), bookingController.getOrganizerBookings);
router.get('/:id', verifyToken, bookingController.getBookingById);
router.post('/:id/negotiate', verifyToken, validate(negotiateSchema), bookingController.negotiate);
router.post('/:id/dispute', verifyToken, validate(disputeSchema), bookingController.raiseDispute);
router.put('/:id/accept', verifyToken, bookingController.acceptBooking);
router.put('/:id/reject', verifyToken, bookingController.rejectBooking);
router.put('/:id/cancel', verifyToken, bookingController.cancelBooking);
router.put('/:id/complete', verifyToken, authorize('customer'), bookingController.completeBooking);

module.exports = router;
