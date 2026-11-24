const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const { COUNTRIES, normalise } = require('../config/regions');
const { getRates } = require('../services/rates');

const router = express.Router();

// Countries, their regions and currencies, and today's rates from US dollars.
router.get('/', async (req, res, next) => {
    try {
        const { rates, source, updatedAt } = await getRates();
        res.set('Cache-Control', 'public, max-age=3600');
        res.json({ success: true, data: { base: 'USD', countries: COUNTRIES, rates, source, updatedAt } });
    } catch (err) { next(err); }
});

const schema = z.object({
    country: z.string().length(2).refine((c) => Boolean(COUNTRIES[c.toUpperCase()]), 'Unsupported country'),
    region: z.string().max(60).optional().nullable(),
});

// The signed-in user's country and region (any role).
router.put('/me', verifyToken, async (req, res, next) => {
    try {
        const parsed = schema.safeParse(req.body || {});
        if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
        const locale = normalise(parsed.data);
        if (parsed.data.region && !locale.region) return res.status(400).json({ success: false, message: 'Pick a region from the list for that country.' });
        const user = await User.findByIdAndUpdate(req.user.id, { $set: { locale } }, { new: true }).select('-password');
        res.json({ success: true, data: { locale: user.locale } });
    } catch (err) { next(err); }
});

module.exports = router;
