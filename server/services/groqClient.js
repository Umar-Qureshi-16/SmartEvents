const Groq = require('groq-sdk');
const env = require('../config/env');

const PLACEHOLDERS = new Set(['', 'not-configured', 'your_groq_api_key_here']);

const MODEL = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

function isConfigured() {
    return !PLACEHOLDERS.has(env.GROQ_API_KEY || '');
}

// Placeholder keeps construction from throwing when AI is not configured.
const groq = new Groq({ apiKey: env.GROQ_API_KEY || 'not-configured' });

class AIError extends Error {
    constructor(code, userMessage, cause) {
        super(userMessage);
        this.code = code;
        this.userMessage = userMessage;
        this.cause = cause;
    }
}

/** Maps a Groq SDK error to something the user (and the logs) can act on. */
function classify(err) {
    const status = err?.status;
    const detail = err?.error?.error?.message || err?.message || 'unknown error';
    if (status === 401) return new AIError('invalid_key', 'The AI service rejected the API key. Check GROQ_API_KEY on the server and redeploy.', err);
    if (status === 403) return new AIError('forbidden', 'The AI service denied access for this key or region.', err);
    if (status === 404 || /decommission|does not exist|not found/i.test(detail)) return new AIError('bad_model', 'The configured AI model is unavailable. Set GROQ_MODEL to a current Groq model.', err);
    if (status === 429) return new AIError('rate_limit', 'The AI service is busy right now. Please wait a few seconds and try again.', err);
    if (status >= 500) return new AIError('upstream', 'The AI service is having problems. Please try again shortly.', err);
    if (!status) return new AIError('network', 'Could not reach the AI service from the server. Check outbound network access.', err);
    return new AIError('unknown', `The AI service returned an error (${status}).`, err);
}

/**
 * chat.completions.create with a clear error contract and one retry on a
 * fallback model if the primary model is missing/decommissioned.
 * Throws AIError; never returns a fake "success" string.
 */
async function complete(params) {
    if (!isConfigured()) {
        throw new AIError('not_configured', 'AI is not configured: GROQ_API_KEY is missing on the server.');
    }
    const model = params.model || MODEL;
    try {
        return await groq.chat.completions.create({ ...params, model });
    } catch (err) {
        const e = classify(err);
        console.error(`[AI] Groq call failed (model=${model}, status=${err?.status}, code=${e.code}):`, err?.error?.error?.message || err?.message);
        if (e.code === 'bad_model' && model !== FALLBACK_MODEL) {
            try {
                return await groq.chat.completions.create({ ...params, model: FALLBACK_MODEL });
            } catch (err2) {
                throw classify(err2);
            }
        }
        throw e;
    }
}

module.exports = { groq, complete, isConfigured, AIError, MODEL, FALLBACK_MODEL };
