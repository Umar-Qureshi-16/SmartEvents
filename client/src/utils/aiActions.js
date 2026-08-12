/**
 * Parses the action protocol defined in the Smartie system prompt
 * (server/services/aiService.js).
 *
 * The prompt instructs the model to append a machine-readable block at the end
 * of a reply when it proposes concrete work:
 *
 *   [ACTION_EVENT_CREATE]: { "title": "...", "type": "...", "price": 0, "description": "..." }
 *   [ACTION_REPORT_GENERATE]: { "timeframe": "monthly", "metrics": ["revenue"] }
 *
 * Nothing on the client parsed these, so the capability was invisible: the raw
 * block was rendered to the user as part of the chat text.
 */

const ACTION_RE = /\[ACTION_([A-Z_]+)\]\s*:\s*(\{[\s\S]*?\})\s*$/;

export const ACTION_TYPES = {
    EVENT_CREATE: 'EVENT_CREATE',
    REPORT_GENERATE: 'REPORT_GENERATE',
};

/**
 * Splits a model reply into display text and a structured action.
 * @returns {{ text: string, action: { type: string, payload: object } | null }}
 */
export function parseAssistantReply(reply = '') {
    const match = reply.match(ACTION_RE);
    if (!match) return { text: reply.trim(), action: null };

    const [full, type, json] = match;
    const text = reply.replace(full, '').trim();

    try {
        const payload = JSON.parse(json);
        // Only surface actions we know how to execute; anything else is
        // stripped from the text but not offered as a button.
        if (!Object.values(ACTION_TYPES).includes(type)) {
            return { text, action: null };
        }
        return { text, action: { type, payload } };
    } catch {
        // Malformed JSON from the model — never show the raw block to the user.
        return { text, action: null };
    }
}

/** Human-readable summary shown on the confirmation card. */
export function describeAction(action) {
    if (!action) return null;

    if (action.type === ACTION_TYPES.EVENT_CREATE) {
        const { title, price, type } = action.payload;
        return {
            heading: 'Create this service?',
            summary: title || 'New service',
            details: [
                type && `Category: ${type}`,
                price != null && `Price: $${Number(price).toLocaleString()}`,
            ].filter(Boolean),
            confirmLabel: 'Create service',
        };
    }

    if (action.type === ACTION_TYPES.REPORT_GENERATE) {
        const { timeframe, metrics } = action.payload;
        return {
            heading: 'Generate this report?',
            summary: `${timeframe || 'Monthly'} performance report`,
            details: [Array.isArray(metrics) && metrics.length ? `Metrics: ${metrics.join(', ')}` : null].filter(Boolean),
            confirmLabel: 'Generate report',
        };
    }

    return null;
}

/**
 * Maps an action onto the API call that carries it out.
 * Category values must match the Event schema enum.
 */
const CATEGORY_MAP = {
    wedding: 'Wedding', corporate: 'Corporate', concert: 'Concert',
    birthday: 'Birthday', conference: 'Conference', exhibition: 'Exhibition',
};

export function buildEventPayload(payload) {
    const raw = String(payload.type || '').toLowerCase();
    const category = CATEGORY_MAP[raw] || 'Corporate';

    return {
        title: payload.title || 'New service package',
        category,
        price: Number(payload.price) || 0,
        description: payload.description || `${payload.title || 'Service'} offered through SmartEvents.`,
        location: payload.location || 'To be confirmed',
        capacity: Number(payload.capacity) || 100,
        date: payload.date || new Date(Date.now() + 30 * 86400000).toISOString(),
    };
}
