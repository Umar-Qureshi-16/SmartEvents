const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/superAdminController');
const { verifyToken, verifySuperAdmin } = require('../middleware/authMiddleware');

// All Super Admin routes require both authentication and Super Admin role
router.use(verifyToken);
router.use(verifySuperAdmin);

// Analytics & Insights
router.get('/stats', SuperAdminController.getPlatformStats);

// Audit Trail
router.get('/logs', SuperAdminController.getAuditLogs);

// Fraud & Security
router.get('/fraud-risks', SuperAdminController.getFraudRisks);
router.post('/user-governance', SuperAdminController.restrictUser);

module.exports = router;
