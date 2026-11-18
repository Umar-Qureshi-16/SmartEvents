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

// Public directory. Declared before '/profile/:id' so 'list' is not captured
// as an :id parameter.
router.get('/list', vendorController.listPublicVendors);
router.get('/profile/:id', vendorController.getPublicProfile);

// What sits behind the numbers on a public profile.
const showcase = require('../services/vendorShowcase');
const send = (fn) => async (req, res, next) => {
    try { res.json({ success: true, data: await fn(req.params.id) }); } catch (err) { next(err); }
};
router.get('/profile/:id/followers', send(showcase.followers));
router.get('/profile/:id/delivered', send(showcase.delivered));
router.get('/profile/:id/trust', send(showcase.trust));

module.exports = router;
