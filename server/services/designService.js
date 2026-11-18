/**
 * Design Studio for a booking: the shared brief (theme, style, colours,
 * budget, references), a decor discussion separate from price offers, and
 * AI-drafted concepts at three price points within the budget.
 *
 * Only the customer and vendor on the booking can read or change it. Writes
 * use atomic $set/$push so they never collide with price negotiation, which
 * relies on the document version for optimistic concurrency.
 */
const Booking = require('../models/Booking');
const socketManager = require('./socketManager');
const notificationService = require('./notificationService');
const { complete, isConfigured } = require('./groqClient');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/AppError');

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const TIERS = ['Essential', 'Signature', 'Luxe'];
const TIER_SHARE = { Essential: 0.7, Signature: 0.9, Luxe: 1.0 };

async function loadForParty(bookingId, userId) {
    const booking = await Booking.findById(bookingId)
        .populate('eventId', 'title category location date')
        .populate('customerId', 'name')
        .populate('vendorId', 'name')
        .populate('designMessages.author', 'name')
        .lean();
    if (!booking) throw new NotFoundError('Booking not found.');
    const uid = String(userId);
    if (String(booking.customerId?._id) !== uid && String(booking.vendorId?._id) !== uid) {
        throw new ForbiddenError('You are not a party to this booking.');
    }
    return booking;
}

const view = (b) => ({
    bookingId: String(b._id),
    event: b.eventId ? { title: b.eventId.title, category: b.eventId.category, location: b.eventId.location, date: b.eventId.date } : null,
    agreedPrice: b.offerPrice,
    brief: b.designBrief || {},
    concepts: b.designConcepts || [],
    messages: (b.designMessages || []).map((m) => ({ _id: m._id, author: m.author?.name || 'Someone', authorId: String(m.author?._id || m.author), text: m.text, createdAt: m.createdAt })),
});

function broadcast(bookingId, actorId, kind) {
    socketManager.emitToRoom(String(bookingId), 'design-updated', { bookingId: String(bookingId), actorId: String(actorId), kind });
}

async function notifyOther(booking, actorId, title, message) {
    const other = String(booking.customerId?._id || booking.customerId) === String(actorId)
        ? (booking.vendorId?._id || booking.vendorId)
        : (booking.customerId?._id || booking.customerId);
    try {
        await notificationService.createNotification({ recipient: other, title, message, type: 'booking', relatedId: booking._id });
    } catch { /* notifications are best-effort */ }
}

async function getDesign(bookingId, userId) {
    return view(await loadForParty(bookingId, userId));
}

async function updateBrief(bookingId, userId, input) {
    const booking = await loadForParty(bookingId, userId);
    const set = {};
    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
    if (input.theme !== undefined) set['designBrief.theme'] = str(input.theme, 120);
    if (input.style !== undefined) set['designBrief.style'] = str(input.style, 120);
    if (input.notes !== undefined) set['designBrief.notes'] = str(input.notes, 2000);
    if (input.colors !== undefined) {
        if (!Array.isArray(input.colors) || input.colors.length > 8 || !input.colors.every((c) => HEX.test(c))) {
            throw new BadRequestError('colors must be up to 8 hex values such as #c9a227.');
        }
        set['designBrief.colors'] = input.colors;
    }
    for (const key of ['budget', 'guestCount']) {
        if (input[key] !== undefined && input[key] !== null && input[key] !== '') {
            const n = Number(input[key]);
            if (!Number.isFinite(n) || n < 0) throw new BadRequestError(`${key} must be a positive number.`);
            set[`designBrief.${key}`] = n;
        }
    }
    if (input.references !== undefined) {
        if (!Array.isArray(input.references) || input.references.length > 12) throw new BadRequestError('Up to 12 reference images.');
        set['designBrief.references'] = input.references.map((r) => {
            const url = String(r?.url || '').trim();
            if (!/^https?:\/\/\S+$/i.test(url)) throw new BadRequestError('Each reference must be a web link starting with http.');
            return { url: url.slice(0, 600), caption: str(r.caption, 160) || '', addedBy: r.addedBy || userId };
        });
    }
    if (!Object.keys(set).length) throw new BadRequestError('Nothing to update.');
    set['designBrief.updatedBy'] = userId;
    set['designBrief.updatedAt'] = new Date();
    await Booking.updateOne({ _id: bookingId }, { $set: set });
    broadcast(bookingId, userId, 'brief');
    await notifyOther(booking, userId, 'Design brief updated', `The design brief for "${booking.eventId?.title || 'your booking'}" was updated.`);
    return getDesign(bookingId, userId);
}

async function addMessage(bookingId, userId, text) {
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean) throw new BadRequestError('Write a message first.');
    if (clean.length > 1500) throw new BadRequestError('Messages are limited to 1500 characters.');
    const booking = await loadForParty(bookingId, userId);
    await Booking.updateOne({ _id: bookingId }, { $push: { designMessages: { author: userId, text: clean } } });
    broadcast(bookingId, userId, 'message');
    await notifyOther(booking, userId, 'New design message', clean.slice(0, 120));
    return getDesign(bookingId, userId);
}

/* ------------------------------------------------------------------ concepts */

function budgetFor(booking) {
    return Number(booking.designBrief?.budget) || Number(booking.offerPrice) || Number(booking.eventDetails?.budget) || 0;
}

// Used when the AI is unavailable, so the studio always produces something useful.
function templateConcepts(booking) {
    const budget = budgetFor(booking) || 1000;
    const brief = booking.designBrief || {};
    const palette = (brief.colors && brief.colors.length ? brief.colors : ['#f5efe6', '#c9a227', '#2f3e46']).slice(0, 5);
    const theme = brief.theme || booking.eventId?.category || 'Event';
    const split = [['Stage and backdrop', 0.3], ['Florals and centrepieces', 0.25], ['Lighting', 0.2], ['Table styling and linen', 0.15], ['Entrance and signage', 0.1]];
    return TIERS.map((tier) => {
        const total = Math.round(budget * TIER_SHARE[tier]);
        return {
            title: `${theme}: ${tier} look`,
            tier,
            summary: `${tier} take on the ${theme.toLowerCase()} theme${brief.style ? ` in a ${brief.style.toLowerCase()} style` : ''}, using ${Math.round(TIER_SHARE[tier] * 100)}% of the budget.`,
            palette,
            elements: split.map(([item, share]) => ({ item, description: `${tier === 'Luxe' ? 'Premium' : tier === 'Signature' ? 'Enhanced' : 'Simple'} ${item.toLowerCase()}.`, cost: Math.round(total * share) })),
            totalCost: total,
            source: 'template',
        };
    });
}

function sanitiseConcept(raw, budget, fallbackPalette) {
    const tier = TIERS.includes(raw?.tier) ? raw.tier : null;
    const elements = Array.isArray(raw?.elements) ? raw.elements.slice(0, 8).map((e) => ({
        item: String(e?.item || '').slice(0, 80),
        description: String(e?.description || '').slice(0, 240),
        cost: Math.max(0, Math.round(Number(e?.cost) || 0)),
    })).filter((e) => e.item) : [];
    if (!tier || !elements.length) return null;
    let total = elements.reduce((t, e) => t + e.cost, 0);
    // Each tier has its own ceiling (Essential 70%, Signature 90%, Luxe 100% of
    // the budget). Models often ignore this, so scale costs down to the cap.
    const cap = budget > 0 ? Math.floor(budget * TIER_SHARE[tier]) : 0;
    if (cap > 0 && total > cap) {
        const k = cap / total;
        elements.forEach((e) => { e.cost = Math.floor(e.cost * k); });
        total = elements.reduce((t, e) => t + e.cost, 0);
    }
    const palette = (Array.isArray(raw.palette) ? raw.palette : []).filter((c) => HEX.test(c)).slice(0, 6);
    return {
        title: String(raw.title || `${tier} concept`).slice(0, 100),
        tier,
        summary: String(raw.summary || '').slice(0, 500),
        palette: palette.length ? palette : fallbackPalette,
        elements,
        totalCost: total,
        source: 'ai',
    };
}

async function aiConcepts(booking) {
    const budget = budgetFor(booking);
    const brief = booking.designBrief || {};
    const facts = {
        event: booking.eventId?.title, category: booking.eventId?.category || booking.eventDetails?.eventType,
        location: booking.eventId?.location || booking.eventDetails?.location,
        budget, guestCount: brief.guestCount, theme: brief.theme, style: brief.style, colors: brief.colors, notes: brief.notes,
        references: (brief.references || []).map((r) => r.caption).filter(Boolean),
        recentDiscussion: (booking.designMessages || []).slice(-8).map((m) => m.text),
    };
    const res = await complete({
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1400,
        messages: [
            { role: 'system', content: 'You are an experienced event decorator in Pakistan. Reply with JSON only.' },
            {
                role: 'user',
                content: `Draft three decor concepts for this booking: ${JSON.stringify(facts)}.
Return {"concepts":[...]} with exactly three items whose "tier" values are "Essential", "Signature" and "Luxe".
Essential uses about 70% of the budget, Signature about 90%, Luxe up to 100%. Never exceed the budget.
Each item: {"title": short name, "tier", "summary": 2 sentences on the look and feel, "palette": 3-5 hex colours that fit the theme and requested colours,
"elements": 4-6 items of {"item", "description", "cost": number in the same currency as the budget}}.
Follow the requested theme, style, colours and notes. Be specific and practical.`,
            },
        ],
    });
    const parsed = JSON.parse(res.choices?.[0]?.message?.content || '{}');
    const fallbackPalette = (brief.colors && brief.colors.length ? brief.colors : ['#f5efe6', '#c9a227', '#2f3e46']);
    const concepts = (parsed.concepts || []).map((c) => sanitiseConcept(c, budget, fallbackPalette)).filter(Boolean);
    if (concepts.length < 3) throw new Error('incomplete AI concepts');
    return concepts.slice(0, 3);
}

async function generateConcepts(bookingId, userId) {
    const booking = await loadForParty(bookingId, userId);
    let concepts;
    try {
        if (!isConfigured()) throw new Error('AI not configured');
        concepts = await aiConcepts(booking);
    } catch (err) {
        console.warn('[Design] falling back to template concepts:', err.message);
        concepts = templateConcepts(booking);
    }
    // A new round replaces the previous unselected drafts but keeps a chosen one.
    const kept = (booking.designConcepts || []).filter((c) => c.selected);
    await Booking.updateOne({ _id: bookingId }, { $set: { designConcepts: [...kept, ...concepts] } });
    broadcast(bookingId, userId, 'concepts');
    await notifyOther(booking, userId, 'New design concepts', `Three decor concepts were drafted for "${booking.eventId?.title || 'your booking'}".`);
    return getDesign(bookingId, userId);
}

async function selectConcept(bookingId, userId, conceptId) {
    const booking = await loadForParty(bookingId, userId);
    const concept = (booking.designConcepts || []).find((c) => String(c._id) === String(conceptId));
    if (!concept) throw new NotFoundError('Concept not found.');
    await Booking.updateOne({ _id: bookingId }, { $set: { 'designConcepts.$[].selected': false } });
    await Booking.updateOne(
        { _id: bookingId, 'designConcepts._id': concept._id },
        { $set: { 'designConcepts.$.selected': true, 'designConcepts.$.selectedBy': userId } }
    );
    broadcast(bookingId, userId, 'selection');
    await notifyOther(booking, userId, 'Design concept chosen', `"${concept.title}" was chosen as the design to follow.`);
    return getDesign(bookingId, userId);
}

module.exports = { getDesign, updateBrief, addMessage, generateConcepts, selectConcept, templateConcepts };
