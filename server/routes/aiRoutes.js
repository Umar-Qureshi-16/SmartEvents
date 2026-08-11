const express = require('express');
const { queryAI, generateEventRFP } = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/query', verifyToken, queryAI);
router.post('/rfp', verifyToken, generateEventRFP);
router.post('/timeline', verifyToken, require('../controllers/aiController').generateTimeline);
router.post('/budget/analyze', verifyToken, require('../controllers/aiController').analyzeBudget);

module.exports = router;
