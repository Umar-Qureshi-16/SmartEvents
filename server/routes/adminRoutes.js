const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

router.use(verifyToken, authorize('admin', 'superadmin'));

router.get('/users', adminController.getUsers);
router.get('/stats', adminController.getStats);
// Business overview (accounts, bookings, revenue) and the platform's bookings list.
const overview = require('../services/adminOverview');
router.get('/overview', async (req, res, next) => { try { res.json({ success: true, data: await overview.overview() }); } catch (e) { next(e); } });
router.get('/bookings', async (req, res, next) => { try { res.json({ success: true, data: await overview.listBookings(req.query) }); } catch (e) { next(e); } });
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/ban', adminController.banUser);
router.put('/users/:id/verify', adminController.verifyVendor);
router.get('/disputes', adminController.getDisputes);
router.put('/bookings/:id/resolve-dispute', adminController.resolveDispute);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
