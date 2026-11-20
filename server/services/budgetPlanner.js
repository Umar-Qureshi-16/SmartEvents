/**
 * Budget planner: "I have 1,500 for my nikah in Lahore" becomes one real
 * vendor package per field (venue, catering, decor...) that fits the money,
 * with cheaper and dearer alternatives, ready to book in one go.
 */
const { packages } = require('./planService');
const { CATEGORIES } = require('../models/EventPlan');
const { BadRequestError } = require('../utils/AppError');

// Share of the total each field usually takes, by kind of event.
const SPLITS = {
    wedding: { venue: 0.35, catering: 0.3, decoration: 0.15, photography: 0.1, makeup: 0.05, music: 0.05 },
    corporate: { venue: 0.4, catering: 0.35, decoration: 0.1, photography: 0.1, music: 0.05 },
    birthday: { venue: 0.3, catering: 0.35, decoration: 0.2, photography: 0.1, music: 0.05 },
    concert: { venue: 0.45, music: 0.3, decoration: 0.1, photography: 0.1, catering: 0.05 },
};
const KIND = (t = '') => {
    const s = t.toLowerCase();
    if (/wedding|nikah|mehndi|walima|barat|shaadi|engage/.test(s)) return 'wedding';
    if (/corporate|conference|gala|seminar|exhibition|launch/.test(s)) return 'corporate';
    if (/concert|show|festival/.test(s)) return 'concert';
    return 'birthday';
};

// Rated vendors first, and packages made for this kind of event ahead of others
// (a wedding should not get a conference hall when a wedding hall fits).
const scoreFor = (kind) => (p) => (p.vendor.rating || 3.5) * 10 + Math.min(p.vendor.reviewsCount || 0, 20)
    + (KIND(`${p.eventType || ''} ${p.title}`) === kind ? 25 : 0);

/** Picks the best-rated package that fits each field's share, then reuses what is left over. */
async function planBudget({ budget, eventType = 'Wedding', city, fields }) {
    const total = Number(budget);
    if (!(total > 0)) throw new BadRequestError('Give a budget greater than zero.');
    const split = { ...SPLITS[KIND(eventType)] };
    const wanted = (fields && fields.length ? fields : Object.keys(split)).filter((f) => CATEGORIES.includes(f));
    if (!wanted.length) throw new BadRequestError(`Fields must be among ${CATEGORIES.join(', ')}.`);
    const weight = wanted.reduce((t, f) => t + (split[f] || 0.1), 0);

    // All options per field (in the city first, otherwise anywhere).
    const options = {};
    for (const f of wanted) {
        let list = city ? await packages({ category: f, location: city, limit: 60 }) : [];
        if (!list.length) list = await packages({ category: f, limit: 60 });
        options[f] = list;
    }

    const kind = KIND(eventType);
    const score = scoreFor(kind);
    const items = wanted.map((f) => ({ field: f, allocation: Math.floor((total * (split[f] || 0.1)) / weight), pick: null }));
    const fit = (f, cap) => options[f].filter((p) => p.price <= cap).sort((a, b) => score(b) - score(a) || b.price - a.price)[0] || null;

    // First pass inside each share; second pass lets leftovers fund fields that found nothing.
    for (const it of items) it.pick = fit(it.field, it.allocation);
    let left = total - items.reduce((t, it) => t + (it.pick?.price || 0), 0);
    for (const it of items.filter((i) => !i.pick)) {
        const p = fit(it.field, left);
        if (p) { it.pick = p; left -= p.price; }
    }

    // Third pass: spend what is left upgrading picks, biggest share first,
    // to a better-suited package where the money allows.
    for (const it of [...items].filter((i) => i.pick).sort((a, b) => b.allocation - a.allocation)) {
        const better = options[it.field]
            .filter((p) => p.price > it.pick.price && p.price <= it.pick.price + left && score(p) >= score(it.pick))
            .sort((a, b) => score(b) - score(a) || b.price - a.price)[0];
        if (better) { left -= better.price - it.pick.price; it.pick = better; }
    }

    const spent = items.reduce((t, it) => t + (it.pick?.price || 0), 0);
    return {
        budget: total,
        eventType,
        city: city || null,
        total: spent,
        remaining: total - spent,
        items: items.map((it) => ({
            field: it.field,
            allocation: it.allocation,
            package: it.pick,
            alternatives: options[it.field].filter((p) => String(p._id) !== String(it.pick?._id)).sort((a, b) => a.price - b.price).slice(0, 3),
            note: it.pick ? null : options[it.field].length
                ? `Cheapest ${it.field} package is ${Math.min(...options[it.field].map((p) => p.price))}, above what is left.`
                : `No ${it.field} packages listed yet.`,
        })),
    };
}

/**
 * Creates (or reuses) the event plan and sends an opening offer for each
 * chosen package, dated for the event. Returns what was sent and what failed.
 */
async function bookBundle(ownerId, { serviceIds, title, eventType = 'Wedding', date, endDate, days, city }) {
    if (!Array.isArray(serviceIds) || !serviceIds.length) throw new BadRequestError('Choose at least one package.');
    if (!date || Number.isNaN(Date.parse(date))) throw new BadRequestError('Give the event date.');
    const planService = require('./planService');
    const plan = await planService.createPlan(ownerId, { title: title || `${eventType} on ${String(date).slice(0, 10)}`, eventType, date, endDate, days, location: city, quick: true });
    const sent = [];
    const failed = [];
    for (const serviceId of [...new Set(serviceIds.map(String))]) {
        try {
            const b = await planService.bookPackage(ownerId, { serviceId, planId: String(plan._id) });
            sent.push({ serviceId, bookingId: String(b._id) });
        } catch (err) {
            failed.push({ serviceId, reason: err.message });
        }
    }
    return { planId: String(plan._id), sent, failed };
}

module.exports = { planBudget, bookBundle, SPLITS };
