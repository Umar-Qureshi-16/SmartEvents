/**
 * Turns a decor design into a photo-style picture of the stage.
 *
 * 1. An image model on OpenRouter, when the account has image credit.
 * 2. Otherwise Pollinations (free, no key). Only the design's own words are
 *    sent: event type, theme, style, colours and decor items, never names,
 *    prices or anything about the people booking.
 */
const env = require('../config/env');

// Hex -> a colour word the image model understands.
const COLOUR_WORDS = {
    maroon: '#7a1f2b', burgundy: '#800020', red: '#c0392b', crimson: '#b0122d', pink: '#f4a6c0', blush: '#f6d5d5',
    gold: '#d4af37', champagne: '#f7e7ce', ivory: '#fffff0', cream: '#f5e6c8', white: '#ffffff', beige: '#e8dcc4',
    silver: '#c0c0c0', grey: '#9e9e9e', black: '#111111', navy: '#1f2a44', blue: '#2e5aac', teal: '#0f6e6e',
    emerald: '#0f7b4b', green: '#2e8b57', sage: '#9caf88', mint: '#bfe3c9', yellow: '#f2c94c', mustard: '#d4a017',
    orange: '#e67e22', peach: '#f8c8a0', coral: '#ff7f50', purple: '#6a3d9a', lavender: '#c9b6e4', brown: '#6f4e37',
};
const rgb = (hex) => {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
function colourName(hex) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || '')) return null;
    const [r, g, b] = rgb(hex);
    let best = null, bestD = Infinity;
    for (const [name, h] of Object.entries(COLOUR_WORDS)) {
        const [r2, g2, b2] = rgb(h);
        const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
        if (d < bestD) { bestD = d; best = name; }
    }
    return best;
}

// What each kind of event usually looks like in Pakistan.
const SCENES = {
    mehndi: 'a Pakistani mehndi night stage with marigold garlands, a low swing or diwan, colourful drapes, brass lanterns and floor cushions',
    nikah: 'an elegant Pakistani nikah stage with a floral arch, a white and gold sofa, sheer drapes and fresh flower arrangements',
    walima: 'a refined Pakistani walima reception stage with a grand backdrop, crystal chandeliers, a couple sofa and tall floral centrepieces',
    baraat: 'a royal Pakistani baraat wedding stage with a grand carved backdrop, red and gold drapes, chandeliers and rose arrangements',
    wedding: 'a luxurious Pakistani wedding stage with a grand backdrop, couple sofa, floral arrangements and chandeliers',
    birthday: 'a birthday party setup with a themed backdrop, balloon garland, cake table and fairy lights',
    corporate: 'a corporate event stage with a branded backdrop panel, podium, lounge seating and clean modern lighting',
    conference: 'a conference stage with a large screen, podium, modern truss lighting and neat seating rows',
};
function scene(eventType = '') {
    const t = String(eventType).toLowerCase();
    const key = Object.keys(SCENES).find((k) => t.includes(k));
    return SCENES[key] || SCENES.wedding;
}

// How many pictures a design gets: the whole setup, then one per decor item.
const MAX_PARTS = 4;
const partsOf = (d = {}) => Math.min(MAX_PARTS, 1 + (d.elements || []).filter((e) => e?.item).length);

/**
 * The text prompt for one picture of a design. Part 0 is the whole setup;
 * part n is the design's n-th decor item (entrance, cake table, backdrop...).
 * The theme leads, so a "Spider-Man" birthday looks like Spider-Man and not
 * like a generic stage; the organizer's own idea (`idea`) is included too.
 */
function buildPrompt(d = {}, part = 0) {
    // Image models follow short prompts that lead with the theme far better
    // than long ones (a long prompt turned a Spider-Man party into a pink one).
    const colours = [...new Set((d.palette || []).map(colourName).filter(Boolean))].slice(0, 3);
    const event = String(d.eventType || 'event').toLowerCase();
    const themed = d.theme ? `${d.theme} themed ${event}` : event;
    const short = (t, n) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const idea = short(d.idea, 140);
    const el = part > 0 ? (d.elements || []).filter((e) => e?.item)[part - 1] : null;
    const subject = el
        ? `${themed} ${el.item.toLowerCase()} decoration${el.description ? `, ${short(el.description, 90)}` : ''}`
        : `${themed} decoration${d.theme ? '' : `, ${scene(d.eventType)}`}`;
    const items = el ? [] : (d.elements || []).map((e) => e.item.toLowerCase()).filter(Boolean).slice(0, 4);
    return [
        subject,
        colours.length ? `${colours.join(' and ')} colours` : null,
        d.style ? `${short(d.style, 30)} style` : null,
        items.length ? items.join(', ') : null,
        idea || null,
        el ? 'close-up detail shot' : 'full wide shot of the whole setup, centred and symmetrical',
        'photorealistic 3D render of a real event decoration, professional event decor photography',
        'soft cinematic lighting, sharp focus, highly detailed, rich textures, no people, no text, no watermark',
    ].filter(Boolean).join(', ').slice(0, 640);
}

async function fromOpenRouter(prompt) {
    const key = [env.OPENROUTER_API_KEY, env.GROQ_API_KEY].find((k) => typeof k === 'string' && k.startsWith('sk-or-'));
    if (!key) return null;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'SmartEvents' },
        body: JSON.stringify({ model: env.DESIGN_IMAGE_MODEL || 'google/gemini-2.5-flash-image', modalities: ['image', 'text'], messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || '';
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(url);
    if (!res.ok || !m) {
        console.warn('[decor-image] OpenRouter image unavailable:', data?.error?.message || res.status);
        return null;
    }
    return { data: Buffer.from(m[2], 'base64'), mime: m[1] };
}

// Pictures are delivered in full HD (1920 x 1080).
const HD = { width: 1920, height: 1080 };
let sharp = null;
try { sharp = require('sharp'); } catch { /* optional: pictures are then stored as received */ }

/**
 * Brings a picture to full HD: crops it to 16:9, scales it to 1920 x 1080 with
 * a high-quality filter, sharpens it lightly and saves it as a high-quality JPEG.
 */
async function toHd(img) {
    if (!sharp || !img?.data) return img;
    try {
        let pipeline = sharp(img.data);
        // The free picture tier stamps its logo in the bottom-right corner;
        // a picture from it is cropped just above that strip first.
        if (img.logo) {
            const { width, height } = await sharp(img.data).metadata();
            pipeline = sharp(await pipeline.extract({ left: 0, top: 0, width, height: Math.round(height * 0.93) }).toBuffer());
        }
        const data = await pipeline
            .resize(HD.width, HD.height, { fit: 'cover', position: 'attention', kernel: 'lanczos3' })
            .sharpen({ sigma: 0.8 })
            .modulate({ saturation: 1.06 })
            .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
            .toBuffer();
        return { data, mime: 'image/jpeg' };
    } catch (err) {
        console.warn('[decor-image] HD finishing skipped:', err.message);
        return img;
    }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The free tier takes one request at a time from a server, so renders queue.
let queue = Promise.resolve();
function queued(fn) {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
}

// Without a key the free tier allows one picture every 45 seconds per server.
// A free key from enter.pollinations.ai (POLLINATIONS_KEY) lifts that limit.
const POLLEN_KEY = process.env.POLLINATIONS_KEY || '';
const GAP_MS = POLLEN_KEY ? 0 : 46000;
let lastRequestAt = 0;

async function fromPollinationsOnce(prompt, seed) {
    const wait = lastRequestAt + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
        + `?width=${HD.width}&height=${HD.height}&nologo=true&model=flux&seed=${seed}`;
    const res = await fetch(url, {
        headers: POLLEN_KEY ? { Authorization: `Bearer ${POLLEN_KEY}` } : {},
        signal: AbortSignal.timeout(60000),
    });
    const mime = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || !mime.startsWith('image/')) {
        const body = await res.json().catch(() => ({}));
        const after = Number(/retry after (\d+)\s*s/i.exec(body?.error?.message || '')?.[1]) || 0;
        return { status: res.status, retryAfter: after, message: body?.error?.message };
    }
    const data = Buffer.from(await res.arrayBuffer());
    return data.length > 1000 ? { data, mime, logo: true } : { status: 'empty' };
}

function fromPollinations(prompt, seed) {
    return queued(async () => {
        for (let attempt = 1; attempt <= 5; attempt++) {
            const r = await fromPollinationsOnce(prompt, seed);
            if (r.data) return r;
            console.warn(`[decor-image] Pollinations unavailable (${r.status}${r.message ? `: ${r.message}` : ''}), attempt ${attempt}`);
            if (![402, 429, 500, 502, 503].includes(r.status)) break;
            if (r.retryAfter) lastRequestAt = Date.now() + r.retryAfter * 1000 + 1000 - GAP_MS;
            else await sleep(5000);
        }
        return null;
    });
}

/** A picture for the design, or null when no image service answered. */
async function renderDecor(design, { seed, part = 0 } = {}) {
    if (env.isTest) return null;
    const prompt = buildPrompt(design, part);
    const s = Number.isInteger(seed) ? seed : Math.floor(Math.random() * 1e6);
    try {
        return toHd((await fromOpenRouter(prompt)) || (await fromPollinations(prompt, s)));
    } catch (err) {
        console.warn('[decor-image] render failed:', err.message);
        return null;
    }
}

// One render at a time per key, so two viewers do not start two renders.
const inFlight = new Map();
function once(key, fn) {
    if (!inFlight.has(key)) {
        inFlight.set(key, Promise.resolve().then(fn).finally(() => inFlight.delete(key)));
    }
    return inFlight.get(key);
}

module.exports = { renderDecor, buildPrompt, colourName, once, partsOf, toHd, HD, MAX_PARTS };
