/**
 * LLM client. Despite the filename (kept so existing imports keep working) it
 * supports two OpenAI-compatible providers:
 *
 *   - OpenRouter: used when OPENROUTER_API_KEY is set, or when the key found in
 *     GROQ_API_KEY starts with "sk-or-" (a very common mix-up).
 *   - Groq: used otherwise, via groq-sdk.
 *
 * `complete()` exposes one contract to the rest of the app: it resolves to
 * { choices: [{ message: { content } }] } or throws an AIError with a
 * user-safe message. It never returns a fake "success" string.
 */
const Groq = require('groq-sdk');
const env = require('../config/env');

const PLACEHOLDERS = new Set(['', 'not-configured', 'your_groq_api_key_here', 'your_openrouter_api_key_here']);
const isReal = (k) => !PLACEHOLDERS.has(k || '');

function resolveProvider() {
    const candidates = [env.OPENROUTER_API_KEY, env.GROQ_API_KEY].filter(isReal);
    const orKey = candidates.find(k => k.startsWith('sk-or-'));
    if (orKey) return { name: 'openrouter', key: orKey };
    const groqKey = isReal(env.GROQ_API_KEY) ? env.GROQ_API_KEY : null;
    if (groqKey) return { name: 'groq', key: groqKey };
    return { name: 'none', key: null };
}

const provider = resolveProvider();

// Groq model ids (also what callers pass today) -> OpenRouter equivalents.
const OR_PRIMARY = env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct';
const OR_FALLBACK = env.OPENROUTER_FALLBACK_MODEL || 'meta-llama/llama-3.1-8b-instruct';
const GROQ_PRIMARY = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_FALLBACK = env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';

const MODEL = provider.name === 'openrouter' ? OR_PRIMARY : GROQ_PRIMARY;
const FALLBACK_MODEL = provider.name === 'openrouter' ? OR_FALLBACK : GROQ_FALLBACK;

function mapModel(requested) {
    if (!requested) return MODEL;
    if (provider.name !== 'openrouter') return requested;
    if (requested.includes('/')) return requested; // already an OpenRouter id
    if (/8b/i.test(requested)) return OR_FALLBACK;
    return OR_PRIMARY;
}

function isConfigured() {
    return provider.name !== 'none';
}

const groq = new Groq({ apiKey: provider.name === 'groq' ? provider.key : 'not-configured' });

class AIError extends Error {
    constructor(code, userMessage, cause) {
        super(userMessage);
        this.code = code;
        this.userMessage = userMessage;
        this.cause = cause;
    }
}

const providerLabel = () => (provider.name === 'openrouter' ? 'OpenRouter' : 'Groq');

function detailOf(err) {
    return err?.error?.error?.message || err?.error?.message || err?.message || 'unknown error';
}

function classify(err) {
    const status = err?.status;
    const detail = detailOf(err);
    const label = providerLabel();
    if (status === 401) return new AIError('invalid_key', `${label} rejected the API key. Check the key on the server and redeploy.`, err);
    if (status === 402) return new AIError('no_credits', `${label} reports insufficient credits. Add credits or use a free model.`, err);
    if (status === 403) return new AIError('forbidden', `${label} denied access for this key, model or region.`, err);
    if (status === 404 || /decommission|does not exist|not found|no endpoints/i.test(detail)) return new AIError('bad_model', 'The configured AI model is unavailable. Set a current model via OPENROUTER_MODEL / GROQ_MODEL.', err);
    if (status === 429) return new AIError('rate_limit', 'The AI service is busy right now. Please wait a few seconds and try again.', err);
    if (status >= 500) return new AIError('upstream', 'The AI service is having problems. Please try again shortly.', err);
    if (!status) return new AIError('network', 'Could not reach the AI service from the server. Check outbound network access.', err);
    return new AIError('unknown', `The AI service returned an error (${status}): ${detail}`.slice(0, 240), err);
}

/** Models sometimes wrap JSON in ```json fences even in JSON mode. */
function stripFences(text) {
    return String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

async function openRouterCall(params, model) {
    const body = { ...params, model };
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${provider.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': env.CLIENT_URL || 'http://localhost:5173',
            'X-Title': 'SmartEvents',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    if (!res.ok || data?.error) {
        const err = new Error(data?.error?.message || `HTTP ${res.status}`);
        err.status = res.ok ? (data.error.code || 502) : res.status;
        err.error = data;
        throw err;
    }
    return data;
}

async function callOnce(params, model) {
    if (provider.name === 'openrouter') {
        try {
            return await openRouterCall(params, model);
        } catch (err) {
            // Some models reject response_format; retry once without it.
            if (err.status === 400 && params.response_format) {
                const { response_format, ...rest } = params;
                return await openRouterCall(rest, model);
            }
            throw err;
        }
    }
    return groq.chat.completions.create({ ...params, model });
}

async function complete(params) {
    if (!isConfigured()) {
        throw new AIError('not_configured', 'AI is not configured: set OPENROUTER_API_KEY (or GROQ_API_KEY) on the server.');
    }
    const model = mapModel(params.model);
    const run = async (m) => {
        const out = await callOnce(params, m);
        if (params.response_format && out?.choices?.[0]?.message?.content) {
            out.choices[0].message.content = stripFences(out.choices[0].message.content);
        }
        return out;
    };
    try {
        return await run(model);
    } catch (err) {
        const e = classify(err);
        console.error(`[AI] ${providerLabel()} call failed (model=${model}, status=${err?.status}, code=${e.code}):`, detailOf(err));
        if (['bad_model', 'rate_limit', 'upstream'].includes(e.code) && model !== FALLBACK_MODEL) {
            try {
                return await run(FALLBACK_MODEL);
            } catch (err2) {
                throw classify(err2);
            }
        }
        throw e;
    }
}

console.log(`[AI] provider=${provider.name}${provider.name !== 'none' ? ` model=${MODEL}` : ''}`);

module.exports = { groq, complete, isConfigured, AIError, MODEL, FALLBACK_MODEL, provider: provider.name };
