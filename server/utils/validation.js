const { z } = require('zod');

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    // Public signup may ONLY create customer or provider accounts.
    // Elevated roles are granted via scripts/seedSuperAdmin.js or by an
    // existing admin through PUT /api/v1/admin/users/:id/role.
    role: z.enum(['customer', 'provider']).default('customer')
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
    // The Event model requires a date. Leaving it optional here let requests
    // through to Mongoose, which then threw a ValidationError the caller saw
    // as an opaque 500 instead of a field-level 400.
    date: z.coerce.date({ message: 'A valid event date is required' }),
    capacity: z.preprocess((val) => Number(val), z.number().min(1).default(100)),
    status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming').optional()
});

// A booking may target an event listing OR a vendor directly. The service has
// always supported both, but this schema used to require eventId, making the
// vendor-direct path unreachable through the API.
const bookingCreateSchema = z.object({
    eventId: z.string().length(24, "Invalid Event ID").optional(),
    vendorId: z.string().length(24, "Invalid Vendor ID").optional(),
    serviceId: z.string().length(24, "Invalid Service ID").optional(),
    offerPrice: z.preprocess((val) => Number(val), z.number().positive("Offer price must be greater than zero")),
    message: z.string().max(500).optional(),
    note: z.string().max(500).optional(),
    eventDetails: z.object({
        eventType: z.string().min(2),
        date: z.string().or(z.date()),
        location: z.string().min(2),
        budget: z.preprocess((v) => (v === undefined || v === '' ? undefined : Number(v)), z.number().min(0).optional()),
        message: z.string().max(500).optional()
    }).optional()
}).refine(d => d.eventId || d.vendorId, {
    message: "Either eventId or vendorId is required",
    path: ["eventId"]
});

const negotiateSchema = z.object({
    price: z.preprocess((val) => Number(val), z.number().positive("Price must be greater than zero")),
    message: z.string().max(500, "Note cannot exceed 500 characters").optional()
});

const disputeSchema = z.object({
    reason: z.string().min(10, "Please describe the issue in at least 10 characters").max(1000)
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
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // Zod v4 exposes `issues`; v3 exposed `errors`. Support both so this
        // keeps working across a dependency bump.
        const issues = result.error.issues ?? result.error.errors ?? [];
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: issues.map(e => ({
                path: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
                message: e.message
            }))
        });
    }

    // Replace the body with the parsed output so controllers receive coerced
    // types and schema defaults rather than raw strings.
    req.body = result.data;
    next();
};

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address")
});

// Accepts either field name so an older client build keeps working, then
// normalises to `password` for the controller.
const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    newPassword: z.string().min(8, "Password must be at least 8 characters").optional()
}).refine(d => d.password || d.newPassword, {
    message: "Password must be at least 8 characters",
    path: ["password"]
});

module.exports = {
    signupSchema,
    loginSchema,
    eventSchema,
    bookingCreateSchema,
    negotiateSchema,
    disputeSchema,
    requestCreateSchema,
    vendorProfileSchema,
    reviewCreateSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    validate
};
