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

/** The text prompt for one design. */
function buildPrompt(d = {}) {
    const colours = [...new Set((d.palette || []).map(colourName).filter(Boolean))].slice(0, 4);
    const items = (d.elements || []).map((e) => e.item).filter(Boolean).slice(0, 6);
    return [
        `Professional photograph of ${scene(d.eventType)}`,
        d.theme ? `themed "${d.theme}"` : null,
        d.style ? `in a ${d.style} style` : null,
        colours.length ? `colour scheme ${colours.join(', ')}` : null,
        items.length ? `featuring ${items.join(', ')}` : null,
        'wide angle, warm ambient lighting, highly detailed, realistic event decor photography, empty venue, no people, no text, no watermark',
    ].filter(Boolean).join(', ').slice(0, 900);
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
        + `?width=1024&height=640&nologo=true&model=flux&seed=${seed}`;
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
    return data.length > 1000 ? { data, mime } : { status: 'empty' };
}

function fromPollinations(prompt, seed) {
    return queued(async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
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
async function renderDecor(design, { seed } = {}) {
    if (env.isTest) return null;
    const prompt = buildPrompt(design);
    const s = Number.isInteger(seed) ? seed : Math.floor(Math.random() * 1e6);
    try {
        return (await fromOpenRouter(prompt)) || (await fromPollinations(prompt, s));
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

module.exports = { renderDecor, buildPrompt, colourName, once };
