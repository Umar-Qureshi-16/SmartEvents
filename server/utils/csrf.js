const { isAllowedOrigin } = require('../config/origins');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cookie-authenticated requests that change state must come from a trusted
 * origin. Browsers always attach Origin (or at least Referer) to such requests,
 * so a missing or foreign value is rejected. Requests authenticated with an
 * Authorization header are not affected: a cross-site attacker cannot set it.
 */
function isTrustedRequest(req) {
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.get('origin');
    if (origin) return isAllowedOrigin(origin);
    const referer = req.get('referer');
    if (referer) {
        try { return isAllowedOrigin(new URL(referer).origin); } catch { return false; }
    }
    return false;
}

module.exports = { isTrustedRequest };
