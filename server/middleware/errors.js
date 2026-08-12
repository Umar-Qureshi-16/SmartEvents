const logger = require('../utils/logger');

// Centralized async handler to eliminate try-catch blocks in controllers.
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Translates a thrown error into an HTTP response.
 *
 * Mongoose and JWT errors carry no `statusCode`, so they used to fall through
 * to a blanket 500 — a bad request looked identical to a server crash, and the
 * client could not tell the difference.
 */
const normalise = (err) => {
    // Schema validation failed (e.g. a required field missing).
    if (err.name === 'ValidationError' && err.errors) {
        return {
            status: 400,
            message: 'Validation Error',
            errors: Object.values(err.errors).map(e => ({ path: e.path, message: e.message })),
        };
    }

    // A malformed ObjectId in a path parameter.
    if (err.name === 'CastError') {
        return { status: 400, message: `Invalid ${err.path}: ${err.value}` };
    }

    // Unique index violation.
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'value';
        return { status: 409, message: `That ${field} is already in use.` };
    }

    // Two writers raced on the same document (optimistic concurrency).
    if (err.name === 'VersionError') {
        return { status: 409, message: 'This record was modified by someone else. Please refresh and try again.' };
    }

    if (err.name === 'JsonWebTokenError') return { status: 401, message: 'Invalid token' };
    if (err.name === 'TokenExpiredError') return { status: 401, message: 'Session expired' };

    // Multer upload failures.
    if (err.code === 'LIMIT_FILE_SIZE') return { status: 400, message: 'That file is too large.' };

    return {
        status: err.status || err.statusCode || 500,
        message: err.message || 'Internal Server Error',
        errors: err.errors || null,
    };
};

const errorHandler = (err, req, res, next) => {
    const { status, message, errors } = normalise(err);
    const env = require('../config/env');

    // Client mistakes are noise at error level; genuine faults are not.
    if (status >= 500) {
        logger.error(`${req.method} ${req.originalUrl} — ${err.message}\n${err.stack}`);
    }

    res.status(status).json({
        success: false,
        message,
        ...(errors ? { errors } : {}),
        // Never leak internals in production.
        ...(!env.isProduction && status >= 500 ? { stack: err.stack } : {}),
    });
};

module.exports = { asyncHandler, errorHandler, normalise };
