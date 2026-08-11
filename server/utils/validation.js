const { z } = require('zod');

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(['customer', 'provider', 'admin', 'superadmin']).default('customer')
});

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
});

const eventSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    category: z.enum(['Wedding', 'Corporate', 'Concert', 'Birthday', 'Conference', 'Exhibition']).default('Wedding'),
    price: z.preprocess((val) => Number(val), z.number().min(0, "Price cannot be negative")),
    location: z.string().min(2, "Location is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    date: z.string().optional(), // Often sent as string from frontend
    capacity: z.preprocess((val) => Number(val), z.number().min(1).default(100)),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming').optional()
});

const bookingCreateSchema = z.object({
    eventId: z.string().min(24, "Invalid Event ID").max(24),
    offerPrice: z.preprocess((val) => Number(val), z.number().min(0, "Offer price cannot be negative")),
    message: z.string().optional(),
    note: z.string().optional()
});

const negotiateSchema = z.object({
    price: z.preprocess((val) => Number(val), z.number().min(0, "Price cannot be negative")),
    message: z.string().optional()
});

const requestCreateSchema = z.object({
    vendorId: z.string().min(24, "Invalid Vendor ID").max(24),
    serviceId: z.string().min(24, "Invalid Service ID").max(24).optional(),
    eventType: z.string().min(2, "Event type is required"),
    date: z.string().min(1, "Date is required"),
    location: z.string().min(2, "Location is required"),
    budget: z.preprocess((val) => val ? Number(val) : undefined, z.number().min(0).optional()),
    message: z.string().optional(),
    offerPrice: z.preprocess((val) => val ? Number(val) : undefined, z.number().min(0).optional()),
    price: z.preprocess((val) => val ? Number(val) : undefined, z.number().min(0).optional())
});

const vendorProfileSchema = z.object({
    businessName: z.string().min(2, "Business name is too short"),
    category: z.enum(['venue', 'catering', 'decoration', 'photography', 'music', 'makeup']),
    location: z.string().min(2, "Location is required"),
    description: z.string().optional(),
    packages: z.array(z.object({
        title: z.string().min(2),
        price: z.number().min(0),
        description: z.string().optional(),
        includes: z.array(z.string()).optional()
    })).optional(),
    portfolioImages: z.array(z.string()).optional()
});

const reviewCreateSchema = z.object({
    eventId: z.string().min(24, "Invalid Event ID").max(24),
    rating: z.preprocess((val) => Number(val), z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5")),
    comment: z.string().min(3, "Comment is too short")
});

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
    }
};

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address")
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters")
});

module.exports = {
    signupSchema,
    loginSchema,
    eventSchema,
    bookingCreateSchema,
    negotiateSchema,
    requestCreateSchema,
    vendorProfileSchema,
    reviewCreateSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    validate
};
