/**
 * Vendor design library: a vendor describes a look (theme, style, budget) and
 * Smartie drafts an itemised design with a palette; the vendor edits it,
 * publishes it on their profile, and organizers can book it directly.
 */
const mongoose = require('mongoose');
const VendorDesign = require('../models/VendorDesign');
const VendorProfile = require('../models/VendorProfile');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { complete } = require('./groqClient');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/AppError');

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const isUrl = (u) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u);
// Common colour names organizers and vendors use, as hex for the palette.
const NAMED = {
    maroon: '#7a1f2b', burgundy: '#800020', red: '#c0392b', crimson: '#b0122d', pink: '#f4a6c0', blush: '#f6d5d5', rose: '#e8a0a0',
    gold: '#d4af37', golden: '#d4af37', champagne: '#f7e7ce', ivory: '#fffff0', cream: '#f5e6c8', white: '#ffffff', beige: '#e8dcc4',
    silver: '#c0c0c0', grey: '#9e9e9e', gray: '#9e9e9e', black: '#111111', navy: '#1f2a44', blue: '#2e5aac', teal: '#0f6e6e',
    emerald: '#0f7b4b', green: '#2e8b57', sage: '#9caf88', mint: '#bfe3c9', olive: '#708238', yellow: '#f2c94c', mustard: '#d4a017',
    orange: '#e67e22', peach: '#f8c8a0', coral: '#ff7f50', purple: '#6a3d9a', lavender: '#c9b6e4', lilac: '#c8a2c8', brown: '#6f4e37',
};
/** Turns names ("maroon", "Gold") and hex codes into a clean hex palette. */
function toHex(colors = []) {
    return (Array.isArray(colors) ? colors : String(colors).split(/[\s,]+/))
        .map((c) => String(c).trim().toLowerCase())
        .map((c) => (HEX.test(c) ? c : NAMED[c.replace(/[^a-z]/g, '')]))
        .filter(Boolean).slice(0, 6);
}

const PALETTES = [['#f5e6c8', '#c9a227', '#7a1f2b', '#ffffff'], ['#0f3d3e', '#d4af37', '#f2efe9', '#8aa29e'], ['#fbe4e4', '#e8a0a0', '#5b3a29', '#ffffff']];

function clean(raw, budget) {
    const elements = (Array.isArray(raw?.elements) ? raw.elements : []).slice(0, 10).map((e) => ({
        item: String(e?.item || '').slice(0, 80),
        description: String(e?.description || '').slice(0, 300),
        cost: Math.max(0, Math.round(Number(e?.cost) || 0)),
    })).filter((e) => e.item);
    if (!elements.length) return null;
    let total = elements.reduce((t, e) => t + e.cost, 0);
    // Keep within the vendor's stated budget; models drift above it.
    if (budget > 0 && total > budget) {
        const k = budget / total;
        elements.forEach((e) => { e.cost = Math.floor(e.cost * k); });
        total = elements.reduce((t, e) => t + e.cost, 0);
    }
    const palette = (Array.isArray(raw.palette) ? raw.palette : []).filter((c) => HEX.test(c)).slice(0, 6);
    return { title: String(raw.title || 'Signature design').slice(0, 120), summary: String(raw.summary || '').slice(0, 800), palette, elements, totalCost: total };
}

function template({ theme, style, eventType, budget }) {
    const b = Number(budget) || 1000;
    const items = [
        ['Stage and backdrop', 0.35, `${style || 'Elegant'} stage with a ${theme || 'floral'} backdrop`],
        ['Flowers and centrepieces', 0.25, 'Fresh arrangements for tables and entrance'],
        ['Lighting', 0.2, 'Warm fairy lights and uplighting'],
        ['Entrance and walkway', 0.12, 'Arch, aisle runner and lanterns'],
        ['Table styling', 0.08, 'Linens, runners and place settings'],
    ];
    return {
        title: `${theme || 'Classic'} ${eventType || 'event'} design`,
        summary: `A ${style || 'timeless'} ${eventType || 'event'} look built around ${theme || 'soft florals'}.`,
        palette: PALETTES[Math.floor(Math.random() * PALETTES.length)],
        elements: items.map(([item, share, description]) => ({ item, description, cost: Math.floor(b * share) })),
        totalCost: items.reduce((t, [, share]) => t + Math.floor(b * share), 0),
    };
}

async function vendorCategory(vendorId) {
    const p = await VendorProfile.findOne({ userId: vendorId }).select('category businessName').lean();
    if (!p) throw new BadRequestError('Create your vendor profile first.');
    return p;
}

/** Drafts a design with the AI (template if the AI is unavailable); saved unpublished. */
async function generate(vendorId, raw = {}) {
    const input = { ...raw, colors: toHex(raw.colors) };
    const budget = Math.max(0, Number(input.budget) || 0);
    if (!budget) throw new BadRequestError('Give the price this design should come to.');
    const profile = await vendorCategory(vendorId);
    let design = null;
    let source = 'ai';
    try {
        const prompt = `You are a ${profile.category} vendor in Pakistan designing a sellable package for a ${input.eventType || 'wedding'}.
Theme: ${input.theme || 'open'}. Style: ${input.style || 'open'}. Colours wanted: ${(input.colors || []).join(', ') || 'your choice'}. Notes: ${input.notes || 'none'}.
The whole design must cost at most ${budget}. List 4 to 7 concrete items with a cost each.
Reply with JSON only: {"title":"string","summary":"two sentences","palette":["#hex",...4],"elements":[{"item":"string","description":"string","cost":number}]}`;
        const res = await complete({ messages: [{ role: 'user', content: prompt }], temperature: 0.7, response_format: { type: 'json_object' } });
        design = clean(JSON.parse(res.choices[0]?.message?.content || '{}'), budget);
    } catch (err) {
        console.warn('[designs] AI unavailable:', err.message);
    }
    if (!design) { design = template({ ...input, budget }); source = 'template'; }
    if (!design.palette.length) design.palette = toHex(input.colors);
    if (!design.palette.length) design.palette = PALETTES[0];
    const created = await VendorDesign.create({
        vendor: vendorId, eventType: input.eventType || 'Wedding', theme: input.theme, style: input.style,
        image: isUrl(input.image) ? input.image : undefined, published: false, source, ...design,
    });
    // A picture of the décor when no photo was given (needs AI image credit).
    if (!created.image) await renderImage(created);
    return VendorDesign.findById(created._id).lean();
}

const owned = async (vendorId, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Design not found.');
    const d = await VendorDesign.findById(id);
    if (!d) throw new NotFoundError('Design not found.');
    if (String(d.vendor) !== String(vendorId)) throw new ForbiddenError('This is not your design.');
    return d;
};

async function update(vendorId, id, body = {}) {
    const d = await owned(vendorId, id);
    if (body.title !== undefined) d.title = String(body.title).slice(0, 120);
    if (body.summary !== undefined) d.summary = String(body.summary).slice(0, 800);
    if (body.eventType !== undefined) d.eventType = String(body.eventType).slice(0, 60);
    if (body.image !== undefined) {
        if (body.image && !isUrl(body.image)) throw new BadRequestError('The photo must be a link starting with https://');
        d.image = body.image || undefined;
    }
    if (body.totalCost !== undefined) {
        const v = Number(body.totalCost);
        if (!(v > 0)) throw new BadRequestError('Price must be more than zero.');
        d.totalCost = Math.round(v);
    }
    if (body.published !== undefined) d.published = Boolean(body.published);
    await d.save();
    return d.toObject();
}

async function remove(vendorId, id) {
    const d = await owned(vendorId, id);
    await d.deleteOne();
}

/**
 * Asks an image model for a picture of the décor. Needs OpenRouter credit; when
 * it is not available the design keeps its drawn concept (drawn in the browser).
 */
async function renderImage(design) {
    const env = require('../config/env');
    const key = [env.OPENROUTER_API_KEY, env.GROQ_API_KEY].find((k) => typeof k === 'string' && k.startsWith('sk-or-'));
    if (!key || env.isTest) return false;
    const prompt = `Photorealistic wide photo of an event stage decoration in Pakistan for a ${design.eventType || 'wedding'}: ${design.title}. `
        + `${design.theme ? `Theme: ${design.theme}. ` : ''}${design.style ? `Style: ${design.style}. ` : ''}`
        + `Colours: ${(design.palette || []).join(', ')}. Includes: ${design.elements.map((e) => e.item).join(', ')}. Elegant lighting, no people, no text.`;
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'SmartEvents' },
            body: JSON.stringify({ model: env.DESIGN_IMAGE_MODEL || 'google/gemini-2.5-flash-image', modalities: ['image', 'text'], messages: [{ role: 'user', content: prompt }] }),
            signal: AbortSignal.timeout(60000),
        });
        const data = await res.json().catch(() => ({}));
        const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || '';
        const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(url);
        if (!res.ok || !m) { console.warn('[designs] image render unavailable:', data?.error?.message || res.status); return false; }
        await VendorDesign.updateOne({ _id: design._id }, { $set: { 'render.data': Buffer.from(m[2], 'base64'), 'render.mime': m[1], image: `/api/v1/designs/${design._id}/image` } });
        return true;
    } catch (err) {
        console.warn('[designs] image render failed:', err.message);
        return false;
    }
}

async function rerender(vendorId, id) {
    const d = await owned(vendorId, id);
    const ok = await renderImage(d);
    return { rendered: ok, design: (await VendorDesign.findById(id).lean()) };
}

async function imageOf(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const d = await VendorDesign.findById(id).select('+render.data +render.mime').lean();
    return d?.render?.data ? { data: d.render.data.buffer ? Buffer.from(d.render.data.buffer) : d.render.data, mime: d.render.mime } : null;
}

const mine = (vendorId) => VendorDesign.find({ vendor: vendorId }).sort({ createdAt: -1 }).lean();

/** Published designs, optionally for one vendor / kind of event / budget. Hides blocked vendors. */
async function browse({ vendor, eventType, maxCost, limit = 30 } = {}) {
    const filter = { published: true };
    if (vendor) {
        if (!mongoose.Types.ObjectId.isValid(vendor)) return [];
        const p = await VendorProfile.findOne({ $or: [{ _id: vendor }, { userId: vendor }] }).select('userId').lean();
        filter.vendor = p ? p.userId : vendor;
    }
    if (eventType) filter.eventType = new RegExp(String(eventType).replace(/[.*+?^${}()|[\]\\]/g, ''), 'i');
    if (maxCost) filter.totalCost = { $lte: Number(maxCost) };
    const blocked = await User.find({ status: { $in: ['banned', 'restricted'] } }).distinct('_id');
    if (blocked.length) filter.vendor = filter.vendor || { $nin: blocked };
    const designs = await VendorDesign.find(filter).sort({ totalCost: 1 }).limit(Math.min(Number(limit) || 30, 60)).lean();
    const profiles = new Map((await VendorProfile.find({ userId: { $in: designs.map((d) => d.vendor) } }).select('userId businessName category location').lean()).map((p) => [String(p.userId), p]));
    return designs.map((d) => ({ ...d, vendorProfile: profiles.get(String(d.vendor)) || null }));
}

/**
 * Books a published design: an opening offer at its price (or the organizer's),
 * with the design already in the booking's Design Studio as the chosen concept.
 */
async function book(customerId, id, { date, location, offerPrice, message } = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Design not found.');
    const d = await VendorDesign.findById(id).lean();
    if (!d || !d.published) throw new NotFoundError('Design not found.');
    if (!date || Number.isNaN(Date.parse(date))) throw new BadRequestError('Give the event date.');
    const profile = await VendorProfile.findOne({ userId: d.vendor }).select('location').lean();
    const booking = await require('./bookingService').createBooking({
        vendorId: String(d.vendor),
        offerPrice: Number(offerPrice) > 0 ? Number(offerPrice) : d.totalCost,
        eventDetails: { eventType: d.eventType || 'Event', date, location: location || profile?.location || 'To be agreed', message: message || `Design: ${d.title}` },
        message: message || `I would like the "${d.title}" design.`,
    }, customerId);
    await Booking.updateOne({ _id: booking._id }, {
        $set: {
            designBrief: { theme: d.theme, style: d.style, colors: d.palette, budget: d.totalCost, notes: `Started from the vendor's "${d.title}" design.`, references: d.image ? [{ url: d.image, caption: d.title, addedBy: customerId }] : [], updatedBy: customerId, updatedAt: new Date() },
            designConcepts: [{ title: d.title, tier: 'Signature', summary: d.summary, palette: d.palette, elements: d.elements, totalCost: d.totalCost, selected: true, selectedBy: customerId, source: d.source === 'ai' ? 'ai' : 'template', createdAt: new Date() }],
        },
    });
    return booking;
}

module.exports = { generate, update, remove, mine, browse, book, toHex, renderImage, rerender, imageOf };
