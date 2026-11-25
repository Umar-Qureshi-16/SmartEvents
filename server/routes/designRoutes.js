const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const designs = require('../services/vendorDesignService');

const wrap = (fn, status = 200) => async (req, res, next) => {
    try { res.status(status).json({ success: true, data: await fn(req) }); } catch (err) { next(err); }
};

// Public: published designs (by vendor, event type, budget).
router.get('/', wrap((req) => designs.browse({ vendor: req.query.vendor, eventType: req.query.eventType, maxCost: req.query.maxCost })));

// Pictures of designs. The first request makes the picture (a few seconds);
// later ones are served from the database.
const sendImage = (find) => async (req, res, next) => {
    try {
        const img = await find(req);
        if (!img) return res.set({ 'Cache-Control': 'no-store', 'Retry-After': '5' }).status(404).json({ success: false, message: 'No picture for this design yet.' });
        res.set('Cache-Control', 'public, max-age=86400').type(img.mime).send(img.data);
    } catch (err) { next(err); }
};
// Design Lab (before the "/:id/..." routes, so "inspiration" is never read as an id).
const lab = require('../services/designLab');
// Inspiration pictures for an event type, theme or own words, following the user's culture.
router.get('/inspiration', verifyToken, wrap((req) => lab.inspiration(req.user.id, req.query)));
// The pictures themselves, through our server so the canvas can use and export them.
// Only links this server signed are fetched; <img> requests carry no token, so this is public.
router.get('/inspiration/image', async (req, res, next) => {
    try {
        const img = await lab.proxyImage(String(req.query.u || ''), String(req.query.s || ''));
        res.set({ 'Cache-Control': 'public, max-age=86400', 'Cross-Origin-Resource-Policy': 'cross-origin' }).type(img.mime).send(img.data);
    } catch (err) { next(err); }
});
// Boards: pinned pictures and the canvas. kind = user (id "me") | design | booking.
router.get('/boards/:kind/:id', verifyToken, wrap((req) => lab.getBoard(req.params.kind, req.params.id, req.user.id)));
router.put('/boards/:kind/:id', verifyToken, wrap((req) => lab.saveBoard(req.params.kind, req.params.id, req.user.id, req.body || {})));
router.put('/boards/:kind/:id/preview', verifyToken, wrap((req) => lab.savePreview(req.params.kind, req.params.id, req.user.id, req.body?.dataUrl)));
router.get('/boards/:kind/:id/preview', verifyToken, sendImage((req) => lab.previewOf(req.params.kind, req.params.id, req.user.id)));

router.get('/:id/image', sendImage((req) => designs.imageOf(req.params.id, req.query.part)));
router.get('/concepts/:bookingId/:conceptId/image', sendImage((req) => designs.conceptImage(req.params.bookingId, req.params.conceptId, req.query.part)));

// Organizers book a design.
router.post('/:id/book', verifyToken, authorize('customer'), wrap(async (req) => {
    const b = await designs.book(req.user.id, req.params.id, req.body || {});
    return { bookingId: b._id };
}, 201));

// Vendors manage their own library.
router.get('/mine', verifyToken, authorize('provider'), wrap((req) => designs.mine(req.user.id)));
// Four theme ideas (with AI-picked colours) to start a design from.
router.post('/themes', verifyToken, authorize('provider'), wrap((req) => designs.suggestThemes(req.user.id, req.body || {})));
// Several options for one theme (count 1-3, default 3), so the vendor can choose.
router.post('/generate', verifyToken, authorize('provider'), wrap((req) => designs.generateOptions(req.user.id, req.body || {}, req.body?.count ?? 3), 201));
router.post('/:id/render', verifyToken, authorize('provider'), wrap((req) => designs.rerender(req.user.id, req.params.id)));
// Puts one of the design's pictures in the vendor's profile gallery.
router.post('/:id/gallery', verifyToken, authorize('provider'), wrap((req) => designs.addToGallery(req.user.id, req.params.id, req.body?.part)));
router.put('/:id', verifyToken, authorize('provider'), wrap((req) => designs.update(req.user.id, req.params.id, req.body || {})));
router.delete('/:id', verifyToken, authorize('provider'), wrap(async (req) => { await designs.remove(req.user.id, req.params.id); return null; }));

module.exports = router;
