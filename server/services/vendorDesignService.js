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
const { renderDecor, once, partsOf, toHd, HD } = require('./decorImage');
const { cultureFor, normalise } = require('../config/regions');
const DesignRender = require('../models/DesignRender');
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

function template({ theme, style, eventType, budget, colors }) {
    const b = Number(budget) || 1000;
    const party = /birthday|party|kids|baby/i.test(eventType || '');
    const t = theme || (party ? 'party' : 'floral');
    // A party is styled differently from a wedding stage.
    const items = party ? [
        ['Theme backdrop', 0.3, `${t} backdrop with the birthday name board`],
        ['Balloon arch', 0.2, `Balloon arch in the ${t} colours at the entrance`],
        ['Cake and dessert table', 0.2, `${t} styled cake table with toppers and dessert stands`],
        ['Table centrepieces', 0.15, `${t} centrepieces for the guest tables`],
        ['Photo corner', 0.15, `${t} photo booth with props`],
    ] : [
        ['Couple stage and backdrop', 0.35, `${style || 'Elegant'} raised couple stage with a sofa and a ${t} fresh-flower backdrop`],
        ['Flowers and centrepieces', 0.25, 'Fresh arrangements for tables and entrance'],
        ['Lighting', 0.2, 'Crystal chandeliers, fairy lights and warm uplighting'],
        ['Entrance and walkway', 0.12, 'Flower-lined entrance walkway with brass lanterns'],
        ['Table styling', 0.08, 'Linens, runners and place settings'],
    ];
    return {
        title: `${theme || 'Classic'} ${eventType || 'event'} design`,
        summary: `A ${style || 'timeless'} ${eventType || 'event'} look built around ${theme || 'soft florals'}.`,
        palette: colors && colors.length ? colors : PALETTES[Math.floor(Math.random() * PALETTES.length)],
        elements: items.map(([item, share, description]) => ({ item, description, cost: Math.floor(b * share) })),
        totalCost: items.reduce((t, [, share]) => t + Math.floor(b * share), 0),
    };
}

/**
 * The designs in an AI reply. Free models do not always use the exact shape
 * asked for: they may wrap the list under another key ("options"), return a
 * bare list, a single design, or put the JSON inside a code fence.
 */
function designList(content) {
    let text = String(content || '').trim();
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    if (fenced) text = fenced[1];
    const start = text.search(/[[{]/);
    if (start > 0) text = text.slice(start);
    let parsed;
    try { parsed = JSON.parse(text); } catch { return []; }
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.designs)) return parsed.designs;
    const list = Object.values(parsed || {}).find((v) => Array.isArray(v) && v.some((x) => x && typeof x === 'object' && Array.isArray(x.elements)));
    if (list) return list;
    return parsed?.elements ? [parsed] : [];
}

async function vendorCategory(vendorId) {
    const p = await VendorProfile.findOne({ userId: vendorId }).select('category businessName').lean();
    if (!p) throw new BadRequestError('Create your vendor profile first.');
    return p;
}

const DIRECTIONS = ['Classic', 'Modern', 'Grand'];

/**
 * Drafts `count` different takes on the vendor's theme (or their own idea)
 * with the AI, falling back to templates; all saved unpublished so the vendor
 * keeps the ones they like. Each gets a picture in the background.
 */
async function generateOptions(vendorId, raw = {}, count = 3) {
    const input = { ...raw, colors: toHex(raw.colors) };
    const guests = Math.min(Math.max(Math.round(Number(input.guests) || 0), 0), 5000);
    const budget = Math.max(0, Number(input.budget) || 0);
    if (!budget) throw new BadRequestError('Give the price this design should come to.');
    const n = Math.min(Math.max(Number(count) || 1, 1), 3);
    const idea = String(input.idea || input.notes || '').trim().slice(0, 600);
    const profile = await vendorCategory(vendorId);
    const locale = normalise((await User.findById(vendorId).select('locale').lean())?.locale);
    const culture = cultureFor(locale, input.eventType);
    let designs = [];
    let source = 'ai';
    try {
        const prompt = `You are a ${profile.category} vendor based in ${culture.label} designing sellable decor packages for a ${input.eventType || 'wedding'}.
How this event is set up in its culture, follow it closely: ${culture.event}.
Regional touches to weave in (the event's own mood comes first): ${culture.place}.
Never use elements foreign to this culture (no church altar, no chairs in rows facing an arch, no champagne or bar).
Theme: ${input.theme || 'open'}. Style: ${input.style || 'open'}. ${input.colors?.length ? `Colours wanted: ${input.colors.join(', ')}.` : 'Pick a palette of 4 colours that suits this theme best (the theme\'s signature colours first).'}
${guests ? `Guests: about ${guests}, so size the seating, tables and centrepieces for that many people.` : ''}
${idea ? `The client's own idea, follow it closely: ${idea}` : 'No extra idea from the client.'}
Create ${n} clearly DIFFERENT design options for this theme (different layouts, props and moods, e.g. a classic take, a modern take and a grand take).
Costs are in US dollars. Each option must cost at most ${budget} (the whole decor) and list 4 to 6 concrete decor items, the three most eye-catching first, (such as backdrop, entrance, cake or dessert table, table centrepieces, photo booth, ceiling or lighting), each with a cost.
Reply with JSON only: {"designs":[{"title":"string","summary":"two sentences describing what it looks like","palette":["#hex",...4],"elements":[{"item":"string","description":"what it looks like","cost":number}]}]}`;
        const res = await complete({ messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 1800, response_format: { type: 'json_object' } });
        designs = designList(res.choices[0]?.message?.content).map((d) => clean(d, budget)).filter(Boolean).slice(0, n);
        if (!designs.length) console.warn('[designs] AI reply had no usable design');
    } catch (err) {
        console.warn('[designs] AI unavailable:', err.message);
    }
    if (!designs.length) {
        source = 'template';
        designs = DIRECTIONS.slice(0, n).map((dir) => {
            const t = template({ ...input, style: input.style || dir, budget });
            return { ...t, title: `${dir} ${t.title}` };
        });
    }
    const created = [];
    for (const design of designs) {
        if (!design.palette.length) design.palette = toHex(input.colors);
        if (!design.palette.length) design.palette = PALETTES[0];
        const doc = await VendorDesign.create({
            vendor: vendorId, eventType: input.eventType || 'Wedding', theme: input.theme, style: input.style, idea: idea || undefined,
            guests: guests || undefined, locale,
            image: isUrl(input.image) ? input.image : undefined, published: false, source, ...design,
        });
        created.push(doc.toObject());
    }
    // Pictures take a while (the free image tier is slow), so they are made in
    // the background, one design after another; the picture endpoint waits.
    // The whole setup comes first for every design, then the pictures of its
    // main pieces, so each design ends up with all of its pictures ready.
    (async () => {
        for (const d of created) if (!d.image) await renderImage(d).catch(() => {});
        for (const d of created) {
            for (let n = 1; n < partsOf(d); n++) await partImage(`design:${d._id}:${n}`, d, n).catch(() => {});
        }
    })();
    return created;
}

const THEME_FALLBACK = {
    party: [
        { name: 'Superhero City', mood: 'Comic skyline backdrop, balloon arch and hero cut-outs.', style: 'Bold', palette: ['#111111', '#f2c94c', '#c0392b', '#2e5aac'] },
        { name: 'Pastel Unicorn', mood: 'Soft rainbow balloons, clouds and a sparkly cake table.', style: 'Whimsical', palette: ['#f4a6c0', '#c9b6e4', '#bfe3c9', '#ffffff'] },
        { name: 'Jungle Safari', mood: 'Tropical leaves, animal cut-outs and earthy balloon garlands.', style: 'Playful', palette: ['#2e8b57', '#d4a017', '#6f4e37', '#f5e6c8'] },
        { name: 'Under the Sea', mood: 'Ocean blues, bubbles and a mermaid treasure cake table.', style: 'Dreamy', palette: ['#0f6e6e', '#2e5aac', '#bfe3c9', '#f8c8a0'] },
    ],
    formal: [
        { name: 'Mughal Royal', mood: 'Carved jaali arch, velvet drapes, brass lanterns and roses.', style: 'Royal', palette: ['#7a1f2b', '#d4af37', '#fffff0', '#0f7b4b'] },
        { name: 'Marigold Mela', mood: 'Marigold strings, colourful drapes, swings and diyas.', style: 'Vibrant', palette: ['#e67e22', '#f2c94c', '#c0392b', '#2e8b57'] },
        { name: 'White Garden', mood: 'White florals, greenery walls, crystal lights and candles.', style: 'Elegant', palette: ['#ffffff', '#9caf88', '#d4af37', '#f5e6c8'] },
        { name: 'Midnight Glam', mood: 'Navy velvet, gold frames, chandeliers and mirror floors.', style: 'Glam', palette: ['#1f2a44', '#d4af37', '#f7e7ce', '#111111'] },
    ],
};

/**
 * Four theme ideas for an event, each with a mood line, a style and a palette
 * the AI picks for that theme, so the vendor starts from a theme and never
 * has to choose colours by hand. `idea` is the vendor's own words, if any.
 */
async function suggestThemes(vendorId, { eventType = 'Wedding', idea = '' } = {}) {
    await vendorCategory(vendorId);
    const culture = cultureFor((await User.findById(vendorId).select('locale').lean())?.locale, eventType);
    const party = /birthday|party|kid|baby|shower/i.test(eventType);
    const own = String(idea || '').trim().slice(0, 300);
    try {
        const prompt = `Suggest 4 clearly different decor themes for a ${eventType} in ${culture.label}${own ? `, built around this idea: ${own}` : ''}.
They must be true to how this event is celebrated there: ${culture.event}. The event's own mood and customs come first; the region only adds its crafts and touches: ${culture.place}.
For each theme give a short name (2-3 words), one sentence on what the setup looks like, a style word, and a palette of 4 hex colours. The palette must be the theme's real signature colours that a professional decorator would use (for example Batman: black, golden yellow, charcoal grey; Mughal royal: maroon, antique gold, ivory, emerald), harmonious together, with no random or clashing colours.
Reply with JSON only: {"themes":[{"name":"string","mood":"string","style":"string","palette":["#hex","#hex","#hex","#hex"]}]}`;
        const res = await complete({ messages: [{ role: 'user', content: prompt }], temperature: 0.9, max_tokens: 700, response_format: { type: 'json_object' } });
        const list = JSON.parse(res.choices[0]?.message?.content || '{}').themes;
        const themes = (Array.isArray(list) ? list : []).map((t) => ({
            name: String(t?.name || '').slice(0, 60),
            mood: String(t?.mood || '').slice(0, 200),
            style: String(t?.style || '').slice(0, 30),
            palette: toHex(t?.palette).slice(0, 5),
        })).filter((t) => t.name && t.palette.length >= 2).slice(0, 4);
        if (themes.length >= 2) return { themes, source: 'ai' };
    } catch (err) {
        console.warn('[designs] theme ideas unavailable:', err.message);
    }
    return { themes: THEME_FALLBACK[party ? 'party' : 'formal'], source: 'template' };
}

/** One design (used by the chat assistant). */
async function generate(vendorId, raw = {}) {
    return (await generateOptions(vendorId, raw, 1))[0];
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
 * Makes a photo-style picture of the décor (see services/decorImage.js) and
 * stores it on the design. Returns false when no image service answered; the
 * design then keeps its drawn concept.
 */
function renderImage(design, opts = {}) {
    return once(`design:${design._id}`, async () => {
        const img = await renderDecor(design, opts);
        if (!img) return false;
        await VendorDesign.updateOne({ _id: design._id }, {
            $set: { 'render.data': img.data, 'render.mime': img.mime, image: `/api/v1/designs/${design._id}/image?v=${Date.now()}` },
        });
        return true;
    });
}

async function rerender(vendorId, id) {
    const d = await owned(vendorId, id);
    // A custom photo link is replaced by a fresh AI picture on request; the
    // pictures of its parts are made again too, in the same quality.
    await DesignRender.deleteMany({ key: { $regex: `^design:${d._id}:[0-9]+$` } });
    const ok = await renderImage(d.toObject(), { seed: Math.floor(Math.random() * 1e6) });
    return { rendered: ok, design: (await VendorDesign.findById(id).lean()) };
}

const bytes = (d) => (d?.buffer ? Buffer.from(d.buffer) : d);

let sharp = null;
try { sharp = require('sharp'); } catch { /* optional */ }
/**
 * Pictures made before full HD were 1024 px wide. The first time one is shown
 * it is brought to 1920 x 1080 and stored again, so old designs look as sharp
 * as new ones. `save` stores the upgraded picture.
 */
async function hd(img, save) {
    if (!sharp || !img?.data) return img;
    try {
        const { width } = await sharp(img.data).metadata();
        if (width >= HD.width) return img;
        const better = await toHd(img);
        if (better !== img) await save(better);
        return better;
    } catch { return img; }
}
// A request waits this long for a picture still being made; the page asks
// again a few seconds later and picks it up once it is stored.
const WAIT_MS = 20000;
const within = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), WAIT_MS))]);

/** Makes (once) and stores one extra picture of a design, keyed in DesignRender. */
async function partImage(key, design, part) {
    const stored = await DesignRender.findOne({ key }).lean();
    if (stored) {
        return hd({ data: bytes(stored.data), mime: stored.mime },
            (b) => DesignRender.updateOne({ key }, { $set: { data: b.data, mime: b.mime } }));
    }
    return within(once(key, async () => {
        const img = await renderDecor(design, { part });
        if (!img) return null;
        await DesignRender.updateOne({ key }, { $set: { data: img.data, mime: img.mime } }, { upsert: true });
        return img;
    }));
}

/**
 * A picture of a design; makes it first if it does not exist yet.
 * Part 0 is the whole setup, parts 1..4 are its decor items.
 */
async function imageOf(id, part = 0) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    let d = await VendorDesign.findById(id).select('+render.data +render.mime').lean();
    if (!d) return null;
    const n = Math.floor(Number(part) || 0);
    if (n > 0) return n < partsOf(d) ? partImage(`design:${id}:${n}`, d, n) : null;
    if (!d.render?.data) {
        if (!(await within(renderImage(d)))) return null;
        d = await VendorDesign.findById(id).select('+render.data +render.mime').lean();
    }
    if (!d?.render?.data) return null;
    return hd({ data: bytes(d.render.data), mime: d.render.mime },
        (b) => VendorDesign.updateOne({ _id: d._id }, { $set: { 'render.data': b.data, 'render.mime': b.mime } }));
}

/** A picture of one of a booking's design concepts (part as above), made on first view. */
async function conceptImage(bookingId, conceptId, part = 0) {
    if (![bookingId, conceptId].every((x) => mongoose.Types.ObjectId.isValid(x))) return null;
    const n = Math.floor(Number(part) || 0);
    const key = n > 0 ? `concept:${conceptId}:${n}` : `concept:${conceptId}`;
    const stored = await DesignRender.findOne({ key }).lean();
    if (stored) return hd({ data: bytes(stored.data), mime: stored.mime }, (b) => DesignRender.updateOne({ key }, { $set: { data: b.data, mime: b.mime } }));
    const booking = await Booking.findOne({ _id: bookingId, 'designConcepts._id': conceptId })
        .select('designConcepts designBrief eventDetails eventId vendorId').populate('eventId', 'category').populate('vendorId', 'locale').lean();
    const concept = booking?.designConcepts?.find((c) => String(c._id) === String(conceptId));
    if (!concept) return null;
    const design = {
        ...concept,
        theme: booking.designBrief?.theme,
        style: booking.designBrief?.style,
        idea: booking.designBrief?.notes,
        eventType: booking.eventDetails?.eventType || booking.eventId?.category || 'Wedding',
        locale: booking.vendorId?.locale,
    };
    if (n >= partsOf(design)) return null;
    return partImage(key, design, n);
}

/**
 * Adds a design's picture to the vendor's profile gallery (once), so it shows
 * with the vendor's own photos. part 0 is the whole setup, 1..4 its decor items.
 */
async function addToGallery(vendorId, id, part = 0) {
    const d = await owned(vendorId, id);
    const n = Math.max(0, Math.floor(Number(part) || 0));
    if (n >= partsOf(d)) throw new BadRequestError('This design has no such picture.');
    if (!(await imageOf(String(d._id), n))) throw new BadRequestError('The picture is still being made. Try again in a minute.');
    const url = `/api/v1/designs/${d._id}/image${n ? `?part=${n}` : ''}`;
    const profile = await VendorProfile.findOneAndUpdate(
        { userId: vendorId },
        { $addToSet: { portfolioImages: url } },
        { new: true }
    ).select('portfolioImages').lean();
    if (!profile) throw new NotFoundError('Set up your vendor profile first.');
    return { url, gallery: profile.portfolioImages };
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

module.exports = { generate, generateOptions, update, remove, mine, browse, book, toHex, renderImage, rerender, imageOf, conceptImage, addToGallery, suggestThemes };
