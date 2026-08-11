const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, chatbotController.handleChatbot);
router.post('/message', verifyToken, chatbotController.handleChatbot);

module.exports = router;
