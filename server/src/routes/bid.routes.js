const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bid.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.post('/', authMiddleware, roleMiddleware('vendor', 'admin'), bidController.placeBid);
router.get('/event/:eventId', authMiddleware, bidController.getBidsByEvent);
router.get('/my', authMiddleware, roleMiddleware('vendor', 'admin'), bidController.getMyBids);
router.put('/:id/counter', authMiddleware, bidController.counterOffer);
router.put('/:id/accept', authMiddleware, roleMiddleware('organizer', 'admin'), bidController.acceptBid);
router.put('/:id/reject', authMiddleware, roleMiddleware('organizer', 'admin'), bidController.rejectBid);

module.exports = router;
