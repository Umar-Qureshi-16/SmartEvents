const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { JWT_SECRET } = require('../middleware/authMiddleware');
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../utils/AppError');

class AuthService {
    async signup(userData) {
        const { name, email, password, role } = userData;
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new ConflictError('An account with this email already exists.');

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        return await user.save();
    }

    generateToken(payload, expiresIn = '1d') {
        return jwt.sign(payload, JWT_SECRET, { expiresIn });
    }

    async login(email, password) {
        const user = await User.findOne({ email }).select('+password');

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

        const token = this.generateToken({ id: user._id, role: user.role });
        const refreshToken = this.generateToken({ id: user._id, role: user.role }, '7d');

        return {
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }

    async refresh(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) throw new UnauthorizedError('This account no longer exists.');

            const newToken = this.generateToken({ id: user._id, role: user.role });
            return { token: newToken };
        } catch (error) {
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
