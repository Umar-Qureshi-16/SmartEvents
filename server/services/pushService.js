/**
 * Push notifications to the Flutter app through Firebase Cloud Messaging.
 *
 * Turned on by setting FIREBASE_SERVICE_ACCOUNT to the Firebase service-account
 * key (the JSON from Firebase console -> Project settings -> Service accounts),
 * either as raw JSON or base64. Without it every call here does nothing, so the
 * server works exactly as before.
 */
const User = require('../models/User');

let messaging;
let tried = false;

function getMessaging() {
    if (tried) return messaging;
    tried = true;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw || process.env.NODE_ENV === 'test') return null;
    try {
        const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
        const admin = require('firebase-admin');
        const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
        messaging = admin.messaging(app);
        console.log('[push] Firebase Cloud Messaging is on');
    } catch (err) {
        console.warn('[push] Firebase is not configured:', err.message);
        messaging = null;
    }
    return messaging;
}

/** Remembers a device so it can be notified (one token per device). */
async function registerToken(userId, token, platform) {
    const clean = String(token || '').trim();
    if (!clean || clean.length > 4096) return false;
    // A device belongs to one account at a time.
    await User.updateMany({ 'pushTokens.token': clean, _id: { $ne: userId } }, { $pull: { pushTokens: { token: clean } } });
    await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token: clean } } });
    await User.updateOne({ _id: userId }, {
        $push: { pushTokens: { $each: [{ token: clean, platform: String(platform || '').slice(0, 20), updatedAt: new Date() }], $slice: -10 } },
    });
    return true;
}

async function removeToken(userId, token) {
    await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token: String(token || '') } } });
}

/** Sends a push to every device of a user; drops tokens Firebase rejects. */
async function sendToUser(userId, { title, body, data = {} }) {
    const m = getMessaging();
    if (!m || !userId) return;
    const user = await User.findById(userId).select('+pushTokens').lean();
    const tokens = (user?.pushTokens || []).map((t) => t.token);
    if (!tokens.length) return;
    const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    const res = await m.sendEachForMulticast({
        tokens,
        notification: { title: String(title || 'SmartEvents').slice(0, 120), body: String(body || '').slice(0, 300) },
        data: payload,
        android: { priority: 'high', notification: { channelId: 'smartevents' } },
        apns: { payload: { aps: { sound: 'default' } } },
    });
    const dead = res.responses
        .map((r, i) => (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code || '') ? tokens[i] : null))
        .filter(Boolean);
    if (dead.length) await User.updateOne({ _id: userId }, { $pull: { pushTokens: { token: { $in: dead } } } });
}

module.exports = { registerToken, removeToken, sendToUser, isEnabled: () => Boolean(getMessaging()) };
