const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../utils/validation');

const { verifyToken: auth } = require('../middleware/authMiddleware');

router.post('/register', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.get('/favorites', auth, authController.getFavorites);
router.post('/favorites', auth, authController.addFavorite);
router.delete('/favorites/:vendorId', auth, authController.removeFavorite);

module.exports = router;
