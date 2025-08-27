// In authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimitMiddleware'); // <--- IMPORT LIMITERS


const { check } = require('express-validator');
router.post(
    '/register',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    ],
    authController.registerUser
);

// @route   POST api/auth/login
// Apply the registration rate limiter here
router.post('/register', registerLimiter, authController.registerUser); // <--- ADD registerLimiter



// Apply the login rate limiter here
router.post('/login', loginLimiter, authController.loginUser); // <--- ADD loginLimiter

// In authController.js
const { validationResult } = require('express-validator');

exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const express = require('express');
    const authController =
    require('../controllers/authController');

    router.post('/register', authController.registerUser);
    // @route POST api/auth/login

    router.get('/me', authMiddleware, authController.getMe);
    module.exports = router;
};