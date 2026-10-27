const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validate, eventSchema } = require('../utils/validation');

const upload = require('../middleware/uploadMiddleware');
const { authorize } = require('../middleware/authMiddleware');

router.get('/', eventController.getEvents);
router.get('/organizer/my-events', verifyToken, authorize('provider', 'admin', 'superadmin'), eventController.getMyEvents);
router.get('/:id', eventController.getEventById);
router.get('/:id/readiness', verifyToken, eventController.getEventReadiness);

router.post('/',
    verifyToken,
    authorize('provider', 'admin', 'superadmin'),
    upload.single('image'),
    validate(eventSchema),
    eventController.createEvent
);

router.put('/:id',
    verifyToken,
    authorize('provider', 'admin', 'superadmin'),
    upload.single('image'),
    validate(eventSchema),
    eventController.updateEvent
);

router.delete('/:id', verifyToken, authorize('provider', 'admin', 'superadmin'), eventController.deleteEvent);

module.exports = router;
