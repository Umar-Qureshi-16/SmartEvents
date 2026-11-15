const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

router.get('/my', verifyToken, ticketController.getMyTickets);
router.post('/purchase', verifyToken, ticketController.purchaseTicket);
router.put('/:id/cancel', verifyToken, ticketController.cancelTicket);
router.get('/event/:eventId', verifyToken, authorize('provider', 'admin', 'superadmin'), ticketController.getEventTickets);
router.post('/scan', verifyToken, authorize('provider', 'admin', 'superadmin'), ticketController.scanCheckInTicket);

module.exports = router;
