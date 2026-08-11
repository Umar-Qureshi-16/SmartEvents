/**
 * Typed application errors.
 *
 * Services used to throw bare `new Error('Access denied...')`, which the
 * global handler could only report as a 500. The client then could not tell
 * "you're not allowed" from "the server broke", and legitimate authorization
 * failures looked like crashes.
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request') { super(message, 400, 'BAD_REQUEST'); }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') { super(message, 401, 'UNAUTHORIZED'); }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') { super(message, 403, 'FORBIDDEN'); }
}

class NotFoundError extends AppError {
    constructor(message = 'Not found') { super(message, 404, 'NOT_FOUND'); }
}

class ConflictError extends AppError {
    constructor(message = 'Conflict') { super(message, 409, 'CONFLICT'); }
}

module.exports = {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError
};
