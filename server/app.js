const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const { errorHandler } = require('./middleware/errors');
const sanitize = require('./middleware/sanitize');

/**
 * Builds the Express application.
 *
 * Kept separate from index.js so tests can mount the app with supertest
 * without opening a port or connecting to a real database.
 */
function createApp() {
    const app = express();

    // Behind a proxy (Render, Railway, Heroku) req.ip is the proxy unless we
    // trust the forwarding header — which would otherwise make every client
    // share one rate-limit bucket.
    app.set('trust proxy', 1);

    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

    app.use(cors({
        origin: (origin, callback) => {
            // Allow same-origin/non-browser callers (curl, health probes).
            if (!origin) return callback(null, true);
            if (env.allowedOrigins.includes(origin)) return callback(null, true);
            // The configured frontend itself is always allowed.
            try {
                if (env.CLIENT_URL && new URL(env.CLIENT_URL).origin === origin) return callback(null, true);
            } catch { /* CLIENT_URL not a valid URL: ignore */ }
            // Vercel generates a new hostname for every deployment of the
            // frontend, so allow deployments under the owner's Vercel scope.
            if (/^https:\/\/[a-z0-9-]+-umar-qureshi-16s-projects\.vercel\.app$/.test(origin)) return callback(null, true);
            return callback(new Error(`CORS: origin ${origin} is not allowed`), false);
        },
        credentials: true,
    }));

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(sanitize);

    app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

    // --- Rate limiting -----------------------------------------------------
    // Tests would otherwise trip these while running many requests in a row.
    if (!env.isTest) {
        // Credential endpoints get a tight bucket: 100 attempts per 15 minutes
        // was wide enough to make credential stuffing practical.
        const strictAuthLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 10,
            skipSuccessfulRequests: true,
            message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
            standardHeaders: true,
            legacyHeaders: false,
        });
        app.use('/api/v1/auth/login', strictAuthLimiter);
        app.use('/api/v1/auth/forgot-password', strictAuthLimiter);
        app.use('/api/v1/auth/reset-password', strictAuthLimiter);
        app.use('/api/v1/auth/resend-verification', strictAuthLimiter);
        app.use('/api/v1/auth/google', strictAuthLimiter);

        app.use('/api/v1/auth/register', rateLimit({
            windowMs: 60 * 60 * 1000,
            max: 20,
            message: { success: false, message: 'Too many accounts created from this address.' },
            standardHeaders: true,
            legacyHeaders: false,
        }));

        // AI endpoints cost money per call.
        app.use('/api/v1/ai', rateLimit({
            windowMs: 60 * 1000,
            max: 20,
            message: { success: false, message: 'You are sending requests too quickly. Please slow down.' },
            standardHeaders: true,
            legacyHeaders: false,
        }));

        app.use('/api/', rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 1000,
            message: { success: false, message: 'Too many requests, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false,
        }));
    }

    // Root health / landing page – provides a simple message or redirects to the front‑end
app.get('/', (req, res) => {
  // If CLIENT_URL is set (front‑end URL), redirect there; otherwise return a friendly JSON message.
  if (env.CLIENT_URL) {
    return res.redirect(env.CLIENT_URL);
  }
  res.json({ success: true, message: 'SmartEvents backend is running.' });
});

// Existing middleware and routes follow…
    app.get('/api/v1/health', (req, res) => {
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        const mem = process.memoryUsage();
        res.json({
            success: true,
            data: {
                status: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
                uptimeSeconds: Math.round(process.uptime()),
                database: states[mongoose.connection.readyState] || 'unknown',
                memory: {
                    heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(1),
                    heapTotalMb: +(mem.heapTotal / 1024 / 1024).toFixed(1),
                    rssMb: +(mem.rss / 1024 / 1024).toFixed(1),
                },
                nodeVersion: process.version,
                environment: env.NODE_ENV,
                timestamp: new Date().toISOString(),
            },
        });
    });

    // --- Interactive API documentation --------------------------------------
    // Skipped under test to keep the suite fast.
    if (!env.isTest) {
        const swaggerUi = require('swagger-ui-express');
        const swaggerSpec = require('./config/swagger');
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            customSiteTitle: 'SmartEvents API',
            swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
        }));
        app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
    }

    // --- Routes ------------------------------------------------------------
    app.use('/api/v1/auth', require('./routes/authRoutes'));
    app.use('/api/v1/events', require('./routes/eventRoutes'));
    app.use('/api/v1/chatbot', require('./routes/chatbotRoutes'));
    app.use('/api/v1/vendor', require('./routes/vendorRoutes'));
    app.use('/api/v1/services', require('./routes/serviceRoutes'));
    app.use('/api/v1/requests', require('./routes/requestRoutes'));
    app.use('/api/v1/admin', require('./routes/adminRoutes'));
    app.use('/api/v1/ai', require('./routes/aiRoutes'));
    app.use('/api/v1/bookings', require('./routes/bookingRoutes'));
    app.use('/api/v1/super-admin', require('./routes/superAdmin'));
    app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
    app.use('/api/v1/reviews', require('./routes/reviewRoutes'));
    app.use('/api/v1/tickets', require('./routes/ticketRoutes'));

    // Unmatched API routes return a clear 404 rather than falling through.
    app.use('/api', (req, res) => {
        res.status(404).json({
            success: false,
            message: `Route not found: ${req.method} ${req.originalUrl}`,
        });
    });

    app.use(errorHandler);

    return app;
}

module.exports = createApp;
