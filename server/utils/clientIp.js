/**
 * Real client IP for rate limiting.
 *
 * In production a request passes through Vercel (the /api rewrite), Cloudflare
 * and Render's own proxy before reaching Express, so req.ip is an internal
 * proxy address that every visitor shares. Using it would put all users in one
 * rate-limit bucket (10 failed logins by anyone would lock everyone out).
 *
 * The headers below are set by those proxies. They can be forged by a caller
 * who reaches the backend directly, so they are only used to *spread* ordinary
 * traffic across buckets; brute-force protection on credential endpoints is
 * keyed by account (see accountOrIpKey), which cannot be dodged by changing IP.
 */
const { ipKeyGenerator } = require('express-rate-limit');

function clientIpInfo(req) {
    const vercel = req.headers['x-vercel-forwarded-for'];
    if (vercel) return { raw: String(vercel).split(',')[0].trim(), source: 'x-vercel-forwarded-for' };
    const cf = req.headers['cf-connecting-ip'];
    if (cf) return { raw: String(cf).trim(), source: 'cf-connecting-ip' };
    return { raw: req.ip, source: 'socket' };
}

/** Normalised key (IPv6 addresses are grouped by /56 so one host cannot rotate). */
const clientIp = (req) => ipKeyGenerator(clientIpInfo(req).raw || 'unknown');

/** Credential endpoints: throttle per account when an email is supplied. */
function accountOrIpKey(req) {
    const email = req.body?.email;
    if (typeof email === 'string' && email.trim()) return `acct:${email.trim().toLowerCase()}`;
    return `ip:${clientIp(req)}`;
}

module.exports = { clientIp, clientIpInfo, accountOrIpKey };
