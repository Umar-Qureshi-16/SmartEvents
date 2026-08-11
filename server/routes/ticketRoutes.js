const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/my', verifyToken, ticketController.getMyTickets);
router.post('/purchase', verifyToken, ticketController.purchaseTicket);
router.post('/scan', verifyToken, ticketController.scanCheckInTicket);

module.exports = router;
