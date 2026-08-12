require('dotenv').config();
const { z } = require('zod');

/**
 * Validates configuration once, at boot.
 *
 * Previously each module read process.env directly with inline fallbacks —
 * including a hardcoded default JWT secret — so a misconfigured deployment
 * started successfully and failed later in ways that looked like bugs.
 */
const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
    CLIENT_URL: z.string().default('http://localhost:5173'),

    // Optional integrations — the app degrades gracefully without them.
    GROQ_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    const issues = parsed.error.issues ?? parsed.error.errors ?? [];
    console.error('\n  Invalid environment configuration:\n');
    for (const issue of issues) {
        console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\n  Copy server/.env.example to server/.env and fill in the values.\n');
    process.exit(1);
}

const env = parsed.data;

module.exports = {
    ...env,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean),
};
