const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const prisma = require('../db');
const env = require('../config/env');
const auth = require('../middleware/auth');
const {
    forgotPasswordLimiter,
    loginLimiter,
    registerLimiter,
    resendVerificationLimiter,
} = require('../middleware/rateLimitMiddleware');
const { OAuth2Client } = require('google-auth-library');
const { sendEmail } = require('../utils/emailService');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createAuthPayload(user) {
    return {
        user: {
            id: user.id,
            role: String(user.role || 'user').toLowerCase(),
            email: user.email
        }
    };
}

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const userId = req.user?.id ? parseInt(req.user.id) : null;
        
        if (!userId || isNaN(userId)) {
            console.error('[Auth] Invalid User ID in token:', req.user?.id);
            return res.status(400).json({ msg: 'Invalid user ID' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                name: true, 
                email: true, 
                role: true, 
                profilePicture: true,
                isVerified: true 
            }
        });

        if (!user) {
            console.warn(`[Auth] User ID ${userId} not found in DB.`);
            return res.status(404).json({ msg: 'User no longer exists' });
        }

        res.json(user);
    } catch (err) {
        console.error('❌ Error in /api/auth/me:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    loginLimiter,
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, rememberMe } = req.body;

        try {
            let user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            if (!user.password) {
                return res.status(400).json({ msg: 'Please log in with Google' });
            }

            if (!user.isVerified) {
                return res.status(400).json({ msg: 'Please verify your email before logging in.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const payload = createAuthPayload(user);

            const expiresIn = rememberMe ? '30d' : '1d';

            if (!env.JWT_SECRET) {
                return res.status(500).json({ msg: 'Server authentication is not configured' });
            }

            jwt.sign(
                payload,
                env.JWT_SECRET,
                { expiresIn },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
    '/register',
    registerLimiter,
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            let user = await prisma.user.findUnique({
                where: { email }
            });

            if (user) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const verificationToken = crypto.randomBytes(20).toString('hex');

            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    verificationToken
                }
            });

            const verificationUrl = `${env.CLIENT_URL}/verify-email/${verificationToken}`;
            
            const emailHtml = `
                <h2>Verify Your Email</h2>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}">${verificationUrl}</a>
            `;

            await sendEmail({
                to: email,
                subject: 'Verify your email',
                html: emailHtml,
            });

            res.json({ msg: 'Registration successful! Please check your email to verify your account.' });

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   POST api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post(
    '/resend-verification',
    resendVerificationLimiter,
    [
        check('email', 'Please include a valid email').isEmail()
    ],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ msg: 'This account has already been verified.' });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken }
        });

        const verificationUrl = `${env.CLIENT_URL}/verify-email/${verificationToken}`;
        
        const emailHtml = `
            <h2>Verify Your Email</h2>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
        `;

        await sendEmail({
            to: email,
            subject: 'Verify your email',
            html: emailHtml,
        });

        res.json({ msg: 'Verification email sent!' });
    } catch (err) {
        console.error('Error in /api/auth/resend-verification:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', async (req, res) => {
    const { token } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: { verificationToken: token }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired token' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null
            }
        });

        res.json({ msg: 'Email verified successfully! You can now log in.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/google
// @desc    Google Login
// @access  Public
router.post('/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { name, email, sub: googleId, picture } = ticket.getPayload();

        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // Update googleId if not present
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { email },
                    data: { googleId, profilePicture: user.profilePicture || picture }
                });
            }
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    googleId,
                    profilePicture: picture,
                    password: null, // Explicitly null
                    isVerified: true // Google users are verified by default
                }
            });
        }

        const payload = createAuthPayload(user);

        if (!env.JWT_SECRET) {
            return res.status(500).json({ msg: 'Server authentication is not configured' });
        }

        jwt.sign(
            payload,
            env.JWT_SECRET,
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('Google Auth Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', forgotPasswordLimiter, [
    check('email', 'Please include a valid email').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpires: passwordResetExpires
            }
        });

        const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}`;

        const emailHtml = `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Please click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you did not request this, please ignore this email.</p>
        `;

        await sendEmail({
            to: user.email,
            subject: 'Password Reset Request',
            html: emailHtml,
        });

        res.json({ msg: 'Email sent' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Token is invalid or has expired' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
                passwordChangedAt: new Date()
            }
        });

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
