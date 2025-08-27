const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError'); // <--- IMPORT AppError

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
exports.registerUser = async (req, res, next) => { // <--- ADD 'next' as a parameter
    const { name, email, password, role } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            // Use AppError for operational errors
            return next(new AppError('User already exists', 400)); // <--- USE AppError
        }
        user = new User({
            name,
            email,
            password,
            role: role || 'user',
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) return next(new AppError('Token generation failed', 500)); // Handle JWT error
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error during registration', 500)); // For unexpected errors, still use AppError
    }
};

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
exports.loginUser = async (req, res, next) => { // <--- ADD 'next'
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return next(new AppError('Invalid Credentials', 400)); // <--- USE AppError
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AppError('Invalid Credentials', 400)); // <--- USE AppError
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) return next(new AppError('Token generation failed', 500));
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error during login', 500)); // <--- USE AppError
    }
};

// @route   GET api/auth/me
// @desc    Get current user (for profile)
// @access  Private
exports.getMe = async (req, res, next) => { // <--- ADD 'next'
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching user profile', 500)); // <--- USE AppError
    }
};
