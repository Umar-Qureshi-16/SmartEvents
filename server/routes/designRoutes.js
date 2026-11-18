const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const designs = require('../services/vendorDesignService');

const wrap = (fn, status = 200) => async (req, res, next) => {
    try { res.status(status).json({ success: true, data: await fn(req) }); } catch (err) { next(err); }
};

// Public: published designs (by vendor, event type, budget).
router.get('/', wrap((req) => designs.browse({ vendor: req.query.vendor, eventType: req.query.eventType, maxCost: req.query.maxCost })));

// The AI-rendered picture of a design, when one exists.
router.get('/:id/image', async (req, res, next) => {
    try {
        const img = await designs.imageOf(req.params.id);
        if (!img) return res.status(404).json({ success: false, message: 'No picture for this design.' });
        res.set('Cache-Control', 'public, max-age=86400').type(img.mime).send(img.data);
    } catch (err) { next(err); }
});

// Organizers book a design.
router.post('/:id/book', verifyToken, authorize('customer'), wrap(async (req) => {
    const b = await designs.book(req.user.id, req.params.id, req.body || {});
    return { bookingId: b._id };
}, 201));

// Vendors manage their own library.
router.get('/mine', verifyToken, authorize('provider'), wrap((req) => designs.mine(req.user.id)));
router.post('/generate', verifyToken, authorize('provider'), wrap((req) => designs.generate(req.user.id, req.body || {}), 201));
router.post('/:id/render', verifyToken, authorize('provider'), wrap((req) => designs.rerender(req.user.id, req.params.id)));
router.put('/:id', verifyToken, authorize('provider'), wrap((req) => designs.update(req.user.id, req.params.id, req.body || {})));
router.delete('/:id', verifyToken, authorize('provider'), wrap(async (req) => { await designs.remove(req.user.id, req.params.id); return null; }));

module.exports = router;
