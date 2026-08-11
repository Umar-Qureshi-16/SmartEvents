const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { verifyToken } = require('../middleware/authMiddleware');

const { validate, vendorProfileSchema } = require('../utils/validation');

router.get('/profile', verifyToken, vendorController.getProfile);
router.post('/profile', verifyToken, validate(vendorProfileSchema), vendorController.updateProfile);
router.post('/services', verifyToken, vendorController.createService);
router.get('/dashboard', verifyToken, vendorController.getDashboard);

router.get('/calendar', verifyToken, vendorController.getBlockedDates);
router.post('/calendar/block', verifyToken, vendorController.blockDate);
router.post('/calendar/unblock', verifyToken, vendorController.unblockDate);

router.get('/services', verifyToken, vendorController.getServices);
router.put('/services/:id', verifyToken, vendorController.updateService);
router.delete('/services/:id', verifyToken, vendorController.deleteService);

router.get('/profile/:id', vendorController.getPublicProfile);

module.exports = router;
