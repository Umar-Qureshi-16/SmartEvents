const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
        verifyEmailSchema, resendVerificationSchema, googleAuthSchema,
        updateProfileSchema, changePasswordSchema, contactSchema } = require('../utils/validation');

const { verifyToken: auth } = require('../middleware/authMiddleware');

router.post('/register', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);
router.post('/google', validate(googleAuthSchema), authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.put('/profile', auth, validate(updateProfileSchema), authController.updateProfile);
router.put('/password', auth, validate(changePasswordSchema), authController.changePassword);
router.post('/contact', validate(contactSchema), authController.submitContact);

router.get('/favorites', auth, authController.getFavorites);
router.post('/favorites', auth, authController.addFavorite);
router.delete('/favorites/:vendorId', auth, authController.removeFavorite);

module.exports = router;
