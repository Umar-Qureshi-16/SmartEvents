const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

/**
 * Interactive API documentation served at /api-docs.
 *
 * Definitions live here rather than as JSDoc scattered through the route files,
 * so the whole contract can be read in one place.
 */
const definition = {
    openapi: '3.0.3',
    info: {
        title: 'SmartEvents API',
        version: '1.0.0',
        description: [
            'REST API for SmartEvents — an event services marketplace with',
            'real-time, two-sided price negotiation.',
            '',
            '**Authentication:** obtain a token from `POST /auth/login`, then send it as',
            '`Authorization: Bearer <token>`. Access tokens last 1 day; use',
            '`POST /auth/refresh` with the refresh token to get a new one.',
            '',
            '**Status codes:** `401` means the credential is missing or stale (refresh it).',
            '`403` means the credential is valid but the role is insufficient.',
        ].join('\n'),
        license: { name: 'ISC' },
    },
    servers: [
        { url: '/api/v1', description: 'Current host' },
        { url: `http://localhost:${env.PORT}/api/v1`, description: 'Local development' },
    ],
    tags: [
        { name: 'Auth', description: 'Registration, login, tokens and password reset' },
        { name: 'Events', description: 'Event listings' },
        { name: 'Bookings', description: 'Offers, negotiation and disputes' },
        { name: 'Vendor', description: 'Provider profile, services and availability' },
        { name: 'Reviews', description: 'Ratings, gated behind a confirmed booking' },
        { name: 'Tickets', description: 'Digital passes and QR check-in' },
        { name: 'Notifications', description: 'In-app notification inbox' },
        { name: 'AI', description: 'Smartie concierge, RFPs, timelines and budgets' },
        { name: 'Admin', description: 'User management and dispute resolution' },
        { name: 'SuperAdmin', description: 'Platform analytics, fraud and governance' },
        { name: 'System', description: 'Health probe' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Access denied.' },
                    errors: {
                        type: 'array',
                        nullable: true,
                        items: {
                            type: 'object',
                            properties: { path: { type: 'string' }, message: { type: 'string' } },
                        },
                    },
                },
            },
            User: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['customer', 'provider', 'admin', 'superadmin'] },
                    trustScore: { type: 'integer', minimum: 0, maximum: 100 },
                    status: { type: 'string', enum: ['active', 'restricted', 'banned'] },
                },
            },
            Event: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string', enum: ['Wedding', 'Corporate', 'Concert', 'Birthday', 'Conference', 'Exhibition'] },
                    price: { type: 'number' },
                    date: { type: 'string', format: 'date-time' },
                    location: { type: 'string' },
                    capacity: { type: 'integer' },
                    status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] },
                },
            },
            NegotiationEntry: {
                type: 'object',
                description: 'One immutable step in the negotiation thread.',
                properties: {
                    price: { type: 'number' },
                    message: { type: 'string' },
                    action: { type: 'string', enum: ['offer', 'counter', 'accepted', 'rejected'] },
                    offeredBy: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                },
            },
            Booking: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    customerId: { type: 'string' },
                    vendorId: { type: 'string' },
                    eventId: { type: 'string', nullable: true },
                    status: {
                        type: 'string',
                        enum: ['pending', 'negotiating', 'confirmed', 'rejected', 'cancelled', 'completed', 'disputed', 'no_show'],
                    },
                    offerPrice: { type: 'number', description: 'The offer currently on the table' },
                    lastPrice: { type: 'number', nullable: true, description: 'Previous offer, for showing the delta' },
                    negotiationHistory: { type: 'array', items: { $ref: '#/components/schemas/NegotiationEntry' } },
                },
            },
        },
        responses: {
            Unauthorized: { description: 'Missing or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            Forbidden: { description: 'Authenticated but insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            ValidationError: { description: 'Invalid request body', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
    },
    security: [{ bearerAuth: [] }],
};

module.exports = swaggerJsdoc({
    definition,
    // Route files carry the per-endpoint @openapi blocks.
    apis: ['./routes/*.js', './docs/openapi/*.yaml'],
});
