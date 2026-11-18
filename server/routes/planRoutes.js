const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const plans = require('../services/planService');

const wrap = (fn) => async (req, res, next) => {
    try { await fn(req, res); } catch (err) { next(err); }
};

// Vendor packages by field: public, so anyone can browse what vendors offer.
router.get('/packages', wrap(async (req, res) => {
    const data = await plans.packages({ category: req.query.category || undefined, maxPrice: req.query.maxPrice, location: req.query.location });
    res.json({ success: true, data });
}));

router.use(verifyToken, authorize('customer'));

// Budget planner: spread a total over real packages, then book the chosen set.
router.post('/budget', wrap(async (req, res) => res.json({ success: true, data: await require('../services/budgetPlanner').planBudget(req.body || {}) })));
router.post('/budget/book', wrap(async (req, res) => res.status(201).json({ success: true, data: await require('../services/budgetPlanner').bookBundle(req.user.id, req.body || {}) })));

router.get('/', wrap(async (req, res) => res.json({ success: true, data: await plans.listPlans(req.user.id) })));
router.post('/', wrap(async (req, res) => res.status(201).json({ success: true, data: await plans.createPlan(req.user.id, req.body || {}) })));
router.post('/book-package', wrap(async (req, res) => {
    const booking = await plans.bookPackage(req.user.id, req.body || {});
    res.status(201).json({ success: true, data: { bookingId: booking._id } });
}));
router.get('/:id', wrap(async (req, res) => res.json({ success: true, data: await plans.getPlan(req.user.id, req.params.id) })));
router.post('/:id/tasks', wrap(async (req, res) => res.status(201).json({ success: true, data: await plans.addTask(req.user.id, req.params.id, req.body || {}) })));
router.patch('/:id/tasks/:taskId', wrap(async (req, res) => res.json({ success: true, data: await plans.setTaskStatus(req.user.id, req.params.id, req.params.taskId, req.body?.status) })));
router.delete('/:id', wrap(async (req, res) => { await plans.deletePlan(req.user.id, req.params.id); res.json({ success: true }); }));

module.exports = router;
