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
// Change your own latest offer before the other side answers it.
router.put('/:id/offer', verifyToken, validate(negotiateSchema), bookingController.reviseOffer);
// Chat next to the offers, at any stage of the booking.
router.post('/:id/messages', verifyToken, bookingController.addChatMessage);
router.post('/:id/dispute', verifyToken, validate(disputeSchema), bookingController.raiseDispute);
router.put('/:id/accept', verifyToken, bookingController.acceptBooking);
router.put('/:id/reject', verifyToken, bookingController.rejectBooking);
router.put('/:id/cancel', verifyToken, bookingController.cancelBooking);
router.put('/:id/complete', verifyToken, authorize('customer'), bookingController.completeBooking);
// Files a booking under one of the organizer's events ({ planId } or { planId: null }).
router.put('/:id/plan', verifyToken, authorize('customer'), bookingController.setBookingPlan);

// Design Studio (customer and vendor on the booking only; checked in the service).
router.get('/:id/design', verifyToken, bookingController.getDesign);
router.put('/:id/design/brief', verifyToken, bookingController.updateDesignBrief);
router.post('/:id/design/messages', verifyToken, bookingController.addDesignMessage);
router.post('/:id/design/concepts', verifyToken, bookingController.generateDesignConcepts);
router.put('/:id/design/concepts/:conceptId/select', verifyToken, bookingController.selectDesignConcept);

module.exports = router;
