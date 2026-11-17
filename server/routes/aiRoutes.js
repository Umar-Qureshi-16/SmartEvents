const express = require('express');
const { queryAI, generateEventRFP } = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/query', verifyToken, queryAI);
router.post('/rfp', verifyToken, generateEventRFP);
router.post('/timeline', verifyToken, require('../controllers/aiController').generateTimeline);
router.post('/budget/analyze', verifyToken, require('../controllers/aiController').analyzeBudget);

// Task assistant: changes are proposed in /agent and only run via /agent/execute after the user confirms.
router.post('/agent', verifyToken, require('../controllers/aiController').agentChat);
router.post('/agent/execute', verifyToken, require('../controllers/aiController').agentExecute);

module.exports = router;
