const authService = require('../services/authService');
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
    const resetToken = await authService.generateResetToken(email);
    console.log(`[FYP EMAIL SIMULATION] To: ${email}, Link: http://localhost:5173/reset-password/${resetToken}`);
    res.json({ 
        success: true, 
        message: 'Identity recovery link generated. Check system logs.', 
        token: resetToken 
    });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Identity access token updated successfully.' });
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
