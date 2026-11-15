const env = require('./env');

// Vercel gives every frontend deployment its own hostname, so deployments under
// the owner's Vercel scope are trusted in addition to the configured origins.
const VERCEL_SCOPE_RE = /^https:\/\/[a-z0-9-]+-umar-qureshi-16s-projects\.vercel\.app$/;

function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (env.allowedOrigins.includes(origin)) return true;
    try {
        if (env.CLIENT_URL && new URL(env.CLIENT_URL).origin === origin) return true;
    } catch { /* CLIENT_URL is not a valid URL: ignore */ }
    return VERCEL_SCOPE_RE.test(origin);
}

module.exports = { isAllowedOrigin };
