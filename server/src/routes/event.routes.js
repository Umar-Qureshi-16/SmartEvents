const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

router.get('/', eventController.getEvents);
router.get('/my', authMiddleware, roleMiddleware('organizer', 'admin'), eventController.getMyEvents);
router.get('/:id', eventController.getEventById);
router.post('/', authMiddleware, roleMiddleware('organizer', 'admin'), eventController.createEvent);
router.put('/:id', authMiddleware, roleMiddleware('organizer', 'admin'), eventController.updateEvent);
router.delete('/:id', authMiddleware, roleMiddleware('organizer', 'admin'), eventController.deleteEvent);

module.exports = router;
