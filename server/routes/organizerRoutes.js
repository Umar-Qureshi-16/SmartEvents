const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const organizers = require('../services/organizerService');

const wrap = (fn) => async (req, res, next) => {
    try { res.json({ success: true, data: await fn(req) }); } catch (err) { next(err); }
};

router.use(verifyToken);
router.get('/me', wrap((req) => organizers.myProfile(req.user.id)));
router.put('/me', wrap((req) => organizers.updateMyProfile(req.user.id, req.body)));
router.get('/:id', wrap((req) => organizers.organizerCard({ id: req.user.id, role: req.user.role }, req.params.id)));

module.exports = router;
