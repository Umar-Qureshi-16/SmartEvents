/**
 * Design Lab: inspiration search and the designer's saved boards.
 *
 * Inspiration pictures come from Openverse (openly licensed photos, no key
 * needed). Each search mixes the event type, the user's culture and region,
 * the theme and their own words, e.g. "mehndi decoration", "pakistani mehndi",
 * "phulkari decoration". Pictures are shown through our own proxy so the
 * canvas can use and export them; the proxy only fetches links it signed
 * itself, so it cannot be used to reach arbitrary addresses.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const env = require('../config/env');
const DesignBoard = require('../models/DesignBoard');
const VendorDesign = require('../models/VendorDesign');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { normalise } = require('../config/regions');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/AppError');

// ------------------------------------------------------------------ search

const ADJECTIVE = { PK: 'pakistani', AE: 'arabic', SA: 'arabic', QA: 'arabic', GB: 'asian', US: 'south asian', CA: 'south asian', AU: 'south asian' };
const REGION_WORDS = {
    Punjab: ['phulkari', 'marigold'],
    Sindh: ['ajrak', 'sindhi'],
    'Khyber Pakhtunkhwa': ['pashtun', 'kilim'],
    Balochistan: ['balochi embroidery'],
    'Islamabad Capital Territory': ['white floral'],
    'Gilgit-Baltistan': ['hunza'],
    'Azad Kashmir': ['kashmiri'],
};
const clean = (s, n = 60) => String(s || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** The searches to run for an event, most specific first. */
function queriesFor({ eventType, theme, q, locale }) {
    const { country, region } = normalise(locale);
    const ev = clean(eventType, 30).toLowerCase() || 'wedding';
    const out = [];
    if (q) out.push(clean(q), `${clean(q)} decoration`);
    if (theme) out.push(`${clean(theme, 40)} ${ev}`, `${clean(theme, 40)} decoration`);
    out.push(`${ev} decoration`, `${ADJECTIVE[country] || ''} ${ev}`.trim(), `${ev} stage`);
    for (const w of REGION_WORDS[region] || []) out.push(`${w} decoration`);
    return [...new Set(out.map((x) => x.toLowerCase()))].slice(0, 5);
}

const sign = (url) => crypto.createHmac('sha256', env.JWT_SECRET).update(`lab:${url}`).digest('base64url').slice(0, 32);
const proxied = (url) => (url ? `/api/v1/designs/inspiration/image?u=${encodeURIComponent(url)}&s=${sign(url)}` : null);

const cache = new Map(); // query -> { at, results }
const CACHE_MS = 6 * 60 * 60 * 1000;

async function openverse(query, page = 1) {
    const key = `${query}|${page}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.results;
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20&page=${page}&mature=false`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartEvents-DesignLab/1.0' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Openverse ${res.status}`);
    const data = await res.json();
    const results = (data.results || []).map((r) => ({
        id: r.id,
        title: String(r.title || 'Untitled').slice(0, 200),
        creator: String(r.creator || 'Unknown').slice(0, 120),
        license: `CC ${String(r.license || '').toUpperCase()} ${r.license_version || ''}`.trim(),
        licenseUrl: r.license_url,
        source: r.source || r.provider,
        landing: r.foreign_landing_url,
        width: r.width,
        height: r.height,
        thumbSrc: r.thumbnail || `https://api.openverse.org/v1/images/${r.id}/thumb/`,
        fullSrc: r.url,
    }));
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), results });
    return results;
}

/** Inspiration pictures for an event, mixing several searches. */
async function inspiration(userId, { eventType, theme, q, page = 1 } = {}) {
    if (process.env.NODE_ENV === 'test') return { queries: [], results: [] };
    const user = await User.findById(userId).select('locale').lean();
    const queries = queriesFor({ eventType, theme, q, locale: user?.locale });
    const lists = await Promise.all(queries.map((x) => openverse(x, Math.max(1, Math.min(Number(page) || 1, 10))).catch(() => [])));
    // Interleave so each search contributes, then drop repeats.
    const seen = new Set();
    const results = [];
    for (let i = 0; i < 20; i++) {
        for (const list of lists) {
            const r = list[i];
            if (r && !seen.has(r.id)) {
                seen.add(r.id);
                results.push({ ...r, thumb: proxied(r.thumbSrc), full: proxied(r.fullSrc || r.thumbSrc), thumbSrc: undefined, fullSrc: undefined });
            }
        }
    }
    return { queries, results: results.slice(0, 60) };
}

// ------------------------------------------------------------------ proxy

const imageCache = new Map(); // url -> { data, mime }
const MAX_BYTES = 10 * 1024 * 1024;

async function proxyImage(url, signature) {
    if (!url || !signature || signature !== sign(url) || !/^https:\/\//i.test(url)) throw new ForbiddenError('This picture link is not valid.');
    const hit = imageCache.get(url);
    if (hit) return hit;
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartEvents-DesignLab/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const mime = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || !mime.startsWith('image/')) throw new NotFoundError('The picture is not available.');
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_BYTES) throw new BadRequestError('The picture is too large.');
    const out = { data, mime };
    if (imageCache.size > 80) imageCache.delete(imageCache.keys().next().value);
    imageCache.set(url, out);
    return out;
}

// ------------------------------------------------------------------ boards

/** Checks access and returns the board key and a title for it. */
async function resolve(kind, id, userId) {
    const uid = String(userId);
    if (kind === 'user') {
        if (id !== 'me' && id !== uid) throw new ForbiddenError('This is not your board.');
        return { key: `user:${uid}`, title: 'My design lab' };
    }
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError('Board not found.');
    if (kind === 'design') {
        const d = await VendorDesign.findById(id).select('vendor title').lean();
        if (!d) throw new NotFoundError('Design not found.');
        if (String(d.vendor) !== uid) throw new ForbiddenError('This is not your design.');
        return { key: `design:${id}`, title: d.title, designId: id };
    }
    if (kind === 'booking') {
        const b = await Booking.findById(id).select('customerId vendorId eventDetails eventId').populate('eventId', 'title').lean();
        if (!b) throw new NotFoundError('Booking not found.');
        if (String(b.customerId) !== uid && String(b.vendorId) !== uid) throw new ForbiddenError('You are not a party to this booking.');
        return { key: `booking:${id}`, title: b.eventId?.title || b.eventDetails?.eventType || 'Booking design' };
    }
    throw new BadRequestError('Unknown board type.');
}

const view = (b, title) => ({
    title: b?.title || title,
    pins: b?.pins || [],
    canvas: b?.canvas || null,
    hasPreview: Boolean(b?.preview?.mime || b?.hasPreview),
    updatedAt: b?.updatedAt || null,
});

async function getBoard(kind, id, userId) {
    const { key, title } = await resolve(kind, id, userId);
    const b = await DesignBoard.findOne({ key }).select('+preview.mime').lean();
    return view(b, title);
}

const isUrl = (u) => typeof u === 'string' && /^(https:\/\/|\/api\/v1\/)/.test(u) && u.length < 900;

async function saveBoard(kind, id, userId, body = {}) {
    const { key, title } = await resolve(kind, id, userId);
    const set = { updatedBy: userId };
    if (body.title !== undefined) set.title = String(body.title).slice(0, 120);
    if (body.pins !== undefined) {
        if (!Array.isArray(body.pins) || body.pins.length > 80) throw new BadRequestError('Up to 80 pinned pictures.');
        set.pins = body.pins.filter((p) => p && isUrl(p.thumb) && isUrl(p.full)).map((p) => ({
            id: String(p.id || '').slice(0, 80), title: String(p.title || '').slice(0, 200), creator: String(p.creator || '').slice(0, 120),
            license: String(p.license || '').slice(0, 40), licenseUrl: isUrl(p.licenseUrl) ? p.licenseUrl : undefined,
            source: String(p.source || '').slice(0, 60), landing: isUrl(p.landing) ? p.landing : undefined,
            thumb: p.thumb, full: p.full, width: Number(p.width) || undefined, height: Number(p.height) || undefined,
            note: p.note ? String(p.note).slice(0, 300) : undefined,
        }));
    }
    if (body.canvas !== undefined) {
        const c = body.canvas;
        if (c !== null) {
            if (typeof c !== 'object' || !Array.isArray(c.layers) || c.layers.length > 400) throw new BadRequestError('A canvas holds up to 400 layers.');
            if (JSON.stringify(c).length > 600000) throw new BadRequestError('The design is too large to save.');
        }
        set.canvas = c;
    }
    await DesignBoard.updateOne({ key }, { $set: set, $setOnInsert: { key } }, { upsert: true });
    return getBoard(kind, id, userId);
}

/** Saves a PNG/JPEG export of the canvas; for a vendor design it also becomes the design's picture. */
async function savePreview(kind, id, userId, dataUrl) {
    const { key, designId } = await resolve(kind, id, userId);
    const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) throw new BadRequestError('Send the picture as a PNG or JPEG data URL.');
    const data = Buffer.from(m[2], 'base64');
    if (data.length > 6 * 1024 * 1024) throw new BadRequestError('The picture is too large (max 6 MB).');
    await DesignBoard.updateOne({ key }, { $set: { 'preview.data': data, 'preview.mime': m[1], updatedBy: userId }, $setOnInsert: { key } }, { upsert: true });
    if (designId) {
        await VendorDesign.updateOne({ _id: designId }, { $set: { 'render.data': data, 'render.mime': m[1], image: `/api/v1/designs/${designId}/image?v=${Date.now()}` } });
    }
    return { saved: true, designPicture: Boolean(designId) };
}

async function previewOf(kind, id, userId) {
    const { key } = await resolve(kind, id, userId);
    const b = await DesignBoard.findOne({ key }).select('+preview.data +preview.mime').lean();
    if (!b?.preview?.data) return null;
    return { data: b.preview.data.buffer ? Buffer.from(b.preview.data.buffer) : b.preview.data, mime: b.preview.mime };
}

module.exports = { inspiration, queriesFor, proxyImage, sign, getBoard, saveBoard, savePreview, previewOf };
