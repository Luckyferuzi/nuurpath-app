const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimitMiddleware');
const { check } = require('express-validator');

// @route POST api/auth/register
router.post(
    '/register',
    registerLimiter,
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    ],
    authController.registerUser
);

// @route POST api/auth/login
router.post('/login', loginLimiter, authController.loginUser);

// @route GET api/auth/me
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
