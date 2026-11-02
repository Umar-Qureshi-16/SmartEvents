const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

router.get('/my', verifyToken, ticketController.getMyTickets);
router.post('/purchase', verifyToken, ticketController.purchaseTicket);
router.post('/scan', verifyToken, authorize('provider', 'admin', 'superadmin'), ticketController.scanCheckInTicket);

module.exports = router;
