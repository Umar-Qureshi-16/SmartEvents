const logger = require('../utils/logger');

// Centralized async handler to eliminate try-catch blocks
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
    // Log the error stack structured
    logger.error(`${err.message} \nStack: ${err.stack}`);

    const statusCode = err.status || err.statusCode || 500;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || null,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = {
    asyncHandler,
    errorHandler
};
