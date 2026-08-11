const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/purchase', authMiddleware, ticketController.purchaseTicket);
router.get('/my', authMiddleware, ticketController.getMyTickets);
router.post('/scan', authMiddleware, ticketController.scanCheckInTicket);

module.exports = router;
