const crypto = require('crypto');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const PlatformSetting = require('../models/PlatformSetting');
const AuditLog = require('../models/AuditLog');
const { AppError, BadRequestError, ForbiddenError } = require('../utils/AppError');

// The code that unlocks admin/superadmin self-signup.
// A super admin can replace it from the console; the new code is stored as a
// bcrypt hash in the database and takes precedence. Until that happens the
// ADMIN_SIGNUP_CODE environment variable is used, so existing deployments keep working.
const KEY = 'adminSignupCodeHash';
const MIN_LENGTH = 8;
const MAX_LENGTH = 100;

const sameString = (given, expected) => {
    const a = Buffer.from(String(given || ''));
    const b = Buffer.from(String(expected));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

async function verify(code) {
    const stored = await PlatformSetting.findOne({ key: KEY }).lean();
    if (stored) {
        if (!code || !(await bcrypt.compare(String(code), stored.value))) {
            throw new ForbiddenError('Invalid admin signup code.');
        }
        return;
    }
    if (!env.ADMIN_SIGNUP_CODE) {
        throw new ForbiddenError('Admin signup is not enabled on this server.');
    }
    if (!sameString(code, env.ADMIN_SIGNUP_CODE)) {
        throw new ForbiddenError('Invalid admin signup code.');
    }
}

// True when a code exists (console or environment).
async function isConfigured() {
    if (env.ADMIN_SIGNUP_CODE) return true;
    return Boolean(await PlatformSetting.exists({ key: KEY }));
}

/**
 * Admin-level accounts must present the code at every sign-in, not only at
 * sign-up. If no code is configured anywhere, sign-in is not blocked, so a
 * deployment can never lock its own administrators out.
 */
async function verifyForSignIn(code) {
    if (!(await isConfigured())) return;
    if (!code) {
        throw new AppError('Admin and Super Admin accounts need the admin access code to sign in.', 403, 'ADMIN_CODE_REQUIRED');
    }
    try {
        await verify(code);
    } catch {
        throw new AppError('The admin access code is incorrect.', 403, 'ADMIN_CODE_INVALID');
    }
}

// Where the active code comes from. The code itself is never returned.
async function status() {
    const stored = await PlatformSetting.findOne({ key: KEY }).populate('updatedBy', 'name email').lean();
    if (stored) {
        return { enabled: true, source: 'console', updatedAt: stored.updatedAt, updatedBy: stored.updatedBy };
    }
    return { enabled: Boolean(env.ADMIN_SIGNUP_CODE), source: env.ADMIN_SIGNUP_CODE ? 'environment' : 'none' };
}

async function change(code, actor, ipAddress) {
    const value = typeof code === 'string' ? code.trim() : '';
    if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
        throw new BadRequestError(`The signup code must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`);
    }
    const hash = await bcrypt.hash(value, 10);
    await PlatformSetting.findOneAndUpdate(
        { key: KEY },
        { value: hash, updatedBy: actor },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    await AuditLog.create({
        action: 'ADMIN_SIGNUP_CODE_CHANGED',
        actor,
        targetType: 'system',
        severity: 'critical',
        ipAddress,
    });
    return status();
}

module.exports = { verify, verifyForSignIn, isConfigured, status, change, MIN_LENGTH };
