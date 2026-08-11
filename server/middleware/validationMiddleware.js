const { z } = require('zod');

// Generalized wrapper for basic schema validation
exports.validateBody = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
                });
            }
            next(error);
        }
    };
};

/* --- Schema Definitions --- */

exports.schemas = {
    // Booking counter-offer validation
    counterOffer: z.object({
        bookingId: z.string().min(10, 'Invalid Booking ID'),
        amount: z.number().positive('Amount must be positive').optional(),
        message: z.string().max(500, 'Message too long').optional()
    }),

    // Event Request Validation
    eventRequest: z.object({
        title: z.string().min(3, 'Title is too short'),
        type: z.enum(['wedding', 'corporate', 'birthday', 'party', 'other']),
        budget: z.number().positive('Budget must be positive'),
        date: z.string(),
        guests: z.number().int().positive()
    }),

    // Auth Validation Example
    login: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password too short')
    })
};
