const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'fyp-secret-key';

class AuthService {
    async signup(userData) {
        const { name, email, password, role } = userData;
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new Error('Identity already registered in ecosystem.');

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        return await user.save();
    }

    generateToken(payload, expiresIn = '1d') {
        return jwt.sign(payload, JWT_SECRET, { expiresIn });
    }

    async login(email, password) {
        const user = await User.findOne({ email }).select('+password');
        if (!user) throw new Error('Identity not found in the global registry.');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Security token mismatch.');

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
            if (!user) throw new Error('Identity node no longer active.');

            const newToken = this.generateToken({ id: user._id, role: user.role });
            return { token: newToken };
        } catch (error) {
            throw new Error('Invalid or expired refresh token.');
        }
    }

    async getUserProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) throw new Error('Identity node not found.');
        return user;
    }

    async generateResetToken(email) {
        const user = await User.findOne({ email });
        if (!user) throw new Error('No node associated with this interface link.');

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

        if (!user) throw new Error('Reset token is invalid or has expired.');

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        return await user.save();
    }
}

module.exports = new AuthService();
