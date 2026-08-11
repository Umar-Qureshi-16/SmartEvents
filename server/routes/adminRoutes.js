const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

router.use(verifyToken, authorize('admin', 'superadmin'));

router.get('/users', adminController.getUsers);
router.get('/stats', adminController.getStats);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/verify', adminController.verifyVendor);
router.put('/bookings/:id/resolve-dispute', adminController.resolveDispute);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
