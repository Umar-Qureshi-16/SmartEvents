const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken } = require('../middleware/authMiddleware');

const { validate, requestCreateSchema } = require('../utils/validation');

router.post('/', verifyToken, validate(requestCreateSchema), requestController.createRequest);
router.put('/:id/status', verifyToken, requestController.updateRequestStatus);
router.get('/', verifyToken, requestController.getRequests);

module.exports = router;
