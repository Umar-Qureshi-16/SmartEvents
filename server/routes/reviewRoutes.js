const express = require('express');
const router = express.Router();
const { createReview, getEventReviews, deleteReview } = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/authMiddleware');

const { validate, reviewCreateSchema } = require('../utils/validation');

router.post('/', verifyToken, validate(reviewCreateSchema), createReview);
router.get('/event/:eventId', getEventReviews);
router.get('/provider', verifyToken, require('../controllers/reviewController').getProviderReviews);
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;
