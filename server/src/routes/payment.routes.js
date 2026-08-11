const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/create-intent', authMiddleware, paymentController.createPaymentIntent);
router.get('/my', authMiddleware, paymentController.getMyPayments);

module.exports = router;
