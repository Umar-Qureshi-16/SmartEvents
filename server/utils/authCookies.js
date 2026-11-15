/**
 * Session cookies.
 *
 * Tokens live in httpOnly cookies so page JavaScript (and therefore any XSS
 * payload) can never read them. The access cookie is sent everywhere; the
 * refresh cookie is path-restricted to the auth endpoints so it is not attached
 * to ordinary API traffic.
 *
 * SameSite defaults to 'lax', which is right when the browser talks to the API
 * through the frontend's own origin (the Vercel rewrite). Set
 * AUTH_COOKIE_SAMESITE=none only for a direct cross-site deployment.
 */
const env = require('../config/env');

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = '/api/v1/auth';

const sameSite = ['lax', 'strict', 'none'].includes((env.AUTH_COOKIE_SAMESITE || '').toLowerCase())
    ? env.AUTH_COOKIE_SAMESITE.toLowerCase()
    : 'lax';

const base = () => ({
    httpOnly: true,
    secure: env.isProduction || sameSite === 'none',
    sameSite,
});

function setAuthCookies(res, { token, refreshToken } = {}) {
    if (token) res.cookie(ACCESS_COOKIE, token, { ...base(), path: '/', maxAge: 24 * 60 * 60 * 1000 });
    if (refreshToken) res.cookie(REFRESH_COOKIE, refreshToken, { ...base(), path: REFRESH_PATH, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res) {
    res.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...base(), path: REFRESH_PATH });
}

/**
 * The browser app sends `X-Auth-Mode: cookie`; it never needs tokens in the
 * response body. Other clients (tests, scripts, older deployed frontends) omit
 * the header and keep receiving them.
 */
const wantsCookieOnly = (req) => req.get('x-auth-mode') === 'cookie';

/** Sets the cookies and sends the session payload, stripping tokens for the browser app. */
function sendSession(req, res, payload, status = 200) {
    setAuthCookies(res, payload);
    const { token, refreshToken, ...rest } = payload;
    res.status(status).json({ success: true, ...(wantsCookieOnly(req) ? rest : { token, refreshToken, ...rest }) });
}

module.exports = { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies, clearAuthCookies, sendSession, wantsCookieOnly };
