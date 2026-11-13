const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

const { JWT_SECRET } = require('../middleware/authMiddleware');
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../utils/AppError');
const { sendVerificationEmail } = require('./mailService');

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

class AuthService {
    async signup(userData) {
        const { name, email, password, role, adminCode, category } = userData;

        if (role === 'admin' || role === 'superadmin') {
            const expected = env.ADMIN_SIGNUP_CODE;
            if (!expected) {
                throw new ForbiddenError('Admin signup is not enabled on this server.');
            }
            const a = Buffer.from(String(adminCode || ''));
            const b = Buffer.from(expected);
            if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
                throw new ForbiddenError('Invalid admin signup code.');
            }
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) throw new ConflictError('An account with this email already exists.');

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const user = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role,
            isEmailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires
        });

        await user.save();

        // Vendors pick a service category at signup (FR-01). Seed a starter
        // profile so it is kept; they complete the details from their dashboard.
        if (role === 'provider') {
            try {
                await VendorProfile.create({
                    userId: user._id,
                    businessName: name,
                    category: category || 'catering',
                    location: 'Not specified yet'
                });
            } catch (err) {
                console.error('Could not create starter vendor profile:', err.message);
            }
        }

        // Dispatch verification email asynchronously
        try {
            await sendVerificationEmail(normalizedEmail, name, verificationToken);
        } catch (err) {
            console.error('Failed to send verification email during signup:', err.message);
        }

        if (!env.isProduction) {
            console.log(`[DEV] Verification link for ${normalizedEmail}: ${env.CLIENT_URL}/verify-email?token=${verificationToken}`);
        }

        return user;
    }

    // Access and refresh tokens share a secret, so each carries a `typ` claim.
    // Without it a long-lived refresh token is accepted as an access token,
    // which makes the short access-token lifetime meaningless.
    generateToken(payload, expiresIn = '1d') {
        return jwt.sign({ ...payload, typ: 'access' }, JWT_SECRET, { expiresIn });
    }

    generateRefreshToken(payload) {
        return jwt.sign({ ...payload, typ: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
    }

    async login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        // Identical message and comparable timing for both failure modes, so
        // an attacker cannot use this endpoint to discover which emails are
        // registered on the platform.
        if (!user) {
            await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu');
            throw new UnauthorizedError('Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new UnauthorizedError('Invalid email or password.');

        if (user.status === 'banned') {
            throw new ForbiddenError('This account has been suspended. Please contact support.');
        }

        if (!user.isEmailVerified) {
            throw new ForbiddenError('Please verify your email address before logging in. Check your inbox for the verification link.');
        }

        const token = this.generateToken({ id: user._id, role: user.role });
        const refreshToken = this.generateRefreshToken({ id: user._id, role: user.role });

        return {
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        };
    }

    async verifyEmail(token) {
        if (!token) throw new BadRequestError('Verification token is required.');

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            throw new BadRequestError('Verification link is invalid or has expired.');
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Automatic authentication upon successful verification
        const authToken = this.generateToken({ id: user._id, role: user.role });
        const refreshToken = this.generateRefreshToken({ id: user._id, role: user.role });

        return {
            token: authToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: true
            }
        };
    }

    async resendVerification(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const genericMessage = 'If an unverified account exists for that email, a verification link has been sent.';

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || user.isEmailVerified) {
            return { message: genericMessage };
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        try {
            await sendVerificationEmail(normalizedEmail, user.name, verificationToken);
        } catch (err) {
            console.error('Failed to resend verification email:', err.message);
        }

        if (!env.isProduction) {
            console.log(`[DEV] Resent verification link for ${normalizedEmail}: ${env.CLIENT_URL}/verify-email?token=${verificationToken}`);
        }

        return { message: genericMessage };
    }

    async googleAuth(credential, role = 'customer') {
        if (!env.GOOGLE_CLIENT_ID) {
            throw new BadRequestError('Google Authentication is not configured on this server.');
        }

        let ticket;
        try {
            ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: env.GOOGLE_CLIENT_ID
            });
        } catch (err) {
            console.error('Google token verification error:', err.message);
            throw new UnauthorizedError('Google authentication failed. Invalid token.');
        }

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new BadRequestError('Google authentication failed: Email address not provided.');
        }

        const { sub: googleId, email, name } = payload;
        const normalizedEmail = email.toLowerCase().trim();

        let user = await User.findOne({
            $or: [{ googleId }, { email: normalizedEmail }]
        });

        if (user) {
            if (!user.googleId) user.googleId = googleId;
            user.isEmailVerified = true; // Email verified by Google
            await user.save();
        } else {
            const validRoles = ['customer', 'provider'];
            const userRole = validRoles.includes(role) ? role : 'customer';

            user = new User({
                name: name || 'Google User',
                email: normalizedEmail,
                googleId,
                role: userRole,
                isEmailVerified: true
            });
            await user.save();
        }

        if (user.status === 'banned') {
            throw new ForbiddenError('This account has been suspended. Please contact support.');
        }

        const token = this.generateToken({ id: user._id, role: user.role });
        const refreshToken = this.generateRefreshToken({ id: user._id, role: user.role });

        return {
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: true
            }
        };
    }

    async refresh(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET);
            if (decoded.typ !== 'refresh') throw new UnauthorizedError('Invalid refresh token.');
            const user = await User.findById(decoded.id);
            if (!user) throw new UnauthorizedError('This account no longer exists.');
            if (user.status === 'banned') throw new ForbiddenError('This account has been suspended.');

            const newToken = this.generateToken({ id: user._id, role: user.role });
            return { token: newToken };
        } catch (error) {
            if (error instanceof ForbiddenError) throw error;
            throw new UnauthorizedError('Invalid or expired refresh token.');
        }
    }

    async getUserProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) throw new NotFoundError('User not found.');
        return user;
    }

    /** Updates the display name and email on the signed-in account. */
    async updateProfile(userId, { name, email }) {
        const user = await User.findById(userId);
        if (!user) throw new NotFoundError('User not found.');

        if (email && email !== user.email) {
            const taken = await User.findOne({ email, _id: { $ne: userId } });
            if (taken) throw new ConflictError('That email is already in use.');
            user.email = email;
        }
        if (name) user.name = name;

        await user.save();
        return User.findById(userId).select('-password');
    }

    /** Changes the password, requiring the current one as proof of identity. */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password');
        if (!user) throw new NotFoundError('User not found.');

        const matches = await bcrypt.compare(currentPassword, user.password);
        if (!matches) throw new UnauthorizedError('Your current password is incorrect.');

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return true;
    }

    async generateResetToken(email) {
        const user = await User.findOne({ email });
        if (!user) throw new NotFoundError('No account is registered with that email.');

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        return resetToken;
    }

    async resetPassword(token, newPassword) {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) throw new BadRequestError('Reset token is invalid or has expired.');

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        return await user.save();
    }
}

module.exports = new AuthService();
