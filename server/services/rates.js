/**
 * Exchange rates from US dollars (the platform's base currency) to each
 * supported currency. Taken from a free public rates feed (no key) and kept
 * for 12 hours; if the feed cannot be reached, recent fixed rates are used.
 */
const { COUNTRIES } = require('../config/regions');

const CODES = [...new Set(Object.values(COUNTRIES).map((c) => c.currency))];
// Fallback rates (November 2026), used only when the feed is unavailable.
const FALLBACK = { USD: 1, PKR: 280, AED: 3.6725, SAR: 3.75, QAR: 3.64, GBP: 0.78, CAD: 1.38, AUD: 1.52 };
const TTL_MS = 12 * 60 * 60 * 1000;

let cache = { rates: FALLBACK, source: 'fixed', updatedAt: null, fetchedAt: 0 };

async function getRates() {
    if (process.env.NODE_ENV === 'test') return { ...cache, rates: FALLBACK };
    if (Date.now() - cache.fetchedAt < TTL_MS) return cache;
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data?.result !== 'success' || !data.rates) throw new Error('no rates');
        const rates = Object.fromEntries(CODES.map((c) => [c, Number(data.rates[c]) || FALLBACK[c]]));
        cache = { rates, source: 'live', updatedAt: data.time_last_update_utc || new Date().toUTCString(), fetchedAt: Date.now() };
    } catch (err) {
        console.warn('[rates] using fixed rates:', err.message);
        // Try again in 30 minutes rather than on every request.
        cache = { ...cache, fetchedAt: Date.now() - TTL_MS + 30 * 60 * 1000 };
    }
    return cache;
}

/** Rate for one currency, e.g. rateFor('PKR') -> 280. */
async function rateFor(currency) {
    const { rates } = await getRates();
    return rates[currency] || 1;
}

module.exports = { getRates, rateFor, FALLBACK };
