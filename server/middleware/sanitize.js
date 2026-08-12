/**
 * Strips MongoDB operator injection from request payloads.
 *
 * Without this, a body such as { "email": { "$ne": null } } reaches
 * User.findOne() as a query operator rather than a value, which can bypass
 * lookups that assume a plain string.
 *
 * Implemented directly rather than via express-mongo-sanitize because Express 5
 * makes req.query a getter-only property, which that package cannot reassign.
 */
const FORBIDDEN_KEY = /^\$|\./;

function scrub(value, depth = 0) {
    if (depth > 10 || value === null || typeof value !== 'object') return value;

    if (Array.isArray(value)) {
        return value.map(v => scrub(v, depth + 1));
    }

    const clean = {};
    for (const [key, val] of Object.entries(value)) {
        // Drop keys starting with '$' (query operators) or containing '.'
        // (path traversal into nested documents).
        if (FORBIDDEN_KEY.test(key)) continue;
        clean[key] = scrub(val, depth + 1);
    }
    return clean;
}

module.exports = function sanitize(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = scrub(req.body);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = scrub(req.params);
    }
    // req.query is a getter in Express 5 — mutate its contents in place.
    if (req.query && typeof req.query === 'object') {
        for (const key of Object.keys(req.query)) {
            if (FORBIDDEN_KEY.test(key)) delete req.query[key];
        }
    }
    next();
};
