/**
 * Test settings, applied before any app code loads, so the suite behaves the
 * same whether it is started with `npm test` or a plain `npx jest` (which
 * would otherwise pick up a developer's .env, e.g. the deployed site as the
 * only trusted origin, and fail the cookie/CSRF tests).
 * dotenv never overrides variables that are already set, so these win.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'test-secret-for-automated-tests-only';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:5174';
process.env.CLIENT_URL = 'http://localhost:5173';
