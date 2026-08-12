const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/superAdminController');
const { verifyToken, verifySuperAdmin } = require('../middleware/authMiddleware');

// Every Super Admin route requires authentication AND superadmin clearance.
router.use(verifyToken);
router.use(verifySuperAdmin);

// Analytics & insights
router.get('/stats', SuperAdminController.getPlatformStats);
router.get('/revenue-series', SuperAdminController.getRevenueSeries);

// Audit trail
router.get('/logs', SuperAdminController.getAuditLogs);

// Fraud & security
router.get('/fraud-risks', SuperAdminController.getFraudRisks);
router.post('/user-governance', SuperAdminController.restrictUser);

// Oversight
router.get('/providers', SuperAdminController.getProviders);
router.get('/disputes', SuperAdminController.getDisputes);

module.exports = router;
