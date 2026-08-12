const authService = require('../services/authService');
const env = require('../config/env');
const { asyncHandler } = require('../middleware/errors');

exports.signup = asyncHandler(async (req, res, next) => {
    const user = await authService.signup(req.body);
    res.status(201).json({ 
        success: true, 
        message: 'Identity established in the global registry.', 
        user: { id: user._id, name: user.name, email: user.email } 
    });
});

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, ...result });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    // Always answer the same way, whether or not the address is registered —
    // a differing response lets an attacker enumerate accounts.
    const genericResponse = {
        success: true,
        message: 'If an account exists for that email, a password reset link has been sent.'
    };

    let resetToken;
    try {
        resetToken = await authService.generateResetToken(email);
    } catch (err) {
        return res.json(genericResponse);
    }

    const resetLink = `${env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
        const { sendEmail } = require('../services/mailService');
        await sendEmail(
            email,
            'Reset your SmartEvents password',
            `<h3>Password reset requested</h3>
             <p>Click the link below to choose a new password. It expires in 15 minutes.</p>
             <p><a href="${resetLink}">${resetLink}</a></p>
             <p>If you did not request this, you can safely ignore this email.</p>`
        );
    } catch (err) {
        console.error('Password reset email failed to send:', err.message);
    }

    // Development convenience only. The token must never leave the server in
    // the response body — anyone could then reset any account they can name.
    if (!env.isProduction) {
        console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
    }

    res.json(genericResponse);
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { token } = req.body;
    const password = req.body.password || req.body.newPassword;
    await authService.resetPassword(token, password);
    res.json({ success: true, message: 'Your password has been updated. You can now sign in.' });
});

exports.me = asyncHandler(async (req, res, next) => {
    const user = await authService.getUserProfile(req.user.id);
    res.json({ success: true, user });
});

exports.refresh = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, ...result });
});

exports.logout = asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Identity terminated from active session.' });
});

exports.getFavorites = asyncHandler(async (req, res, next) => {
    const User = require('../models/User');
    const VendorProfile = require('../models/VendorProfile');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const profiles = await VendorProfile.find({ userId: { $in: user.favorites || [] } }).populate('userId', 'name email trustScore');
    res.json({ success: true, data: profiles });
});

exports.addFavorite = asyncHandler(async (req, res, next) => {
    const User = require('../models/User');
    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ success: false, message: 'vendorId is required' });

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $addToSet: { favorites: vendorId } },
        { new: true }
    );
    res.json({ success: true, message: 'Added to wishlist', favorites: user.favorites });
});

exports.removeFavorite = asyncHandler(async (req, res, next) => {
    const User = require('../models/User');
    const { vendorId } = req.params;
    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { favorites: vendorId } },
        { new: true }
    );
    res.json({ success: true, message: 'Removed from wishlist', favorites: user.favorites });
});
