const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../db');
const env = require('../config/env');
const auth = require('../middleware/auth');
const {
    forgotPasswordLimiter,
    loginLimiter,
    registerLimiter,
    resendVerificationLimiter,
} = require('../middleware/rateLimitMiddleware');
const { sendEmail } = require('../utils/emailService');
const {
    createRandomToken,
    escapeHtml,
    hashToken,
} = require('../utils/security');

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const GENERIC_FORGOT_PASSWORD_RESPONSE = 'If an account exists for this email, reset instructions have been sent.';
const GENERIC_RESEND_VERIFICATION_RESPONSE = 'If an account exists and still needs verification, a verification email has been sent.';
const INVALID_OR_EXPIRED_TOKEN_MESSAGE = 'Invalid or expired token.';
const VERIFICATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function createAuthPayload(user) {
    return {
        user: {
            id: user.id,
            role: user.role,
            email: user.email,
        },
    };
}

function normalizeEmailInput(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function createVerificationUrl(token) {
    return `${env.CLIENT_URL}/verify-email/${token}`;
}

function createVerificationEmailHtml(verificationUrl) {
    const safeUrl = escapeHtml(verificationUrl);

    return `
        <h2>Verify Your Email</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${safeUrl}">${safeUrl}</a>
        <p>If you did not create this account, you can safely ignore this message.</p>
    `;
}

function createPasswordResetEmailHtml(resetUrl) {
    const safeUrl = escapeHtml(resetUrl);

    return `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${safeUrl}">${safeUrl}</a>
        <p>If you did not request this, you can safely ignore this email.</p>
    `;
}

function createTokenRecord({ bytes = 32, ttlMs }) {
    const rawToken = createRandomToken(bytes);

    return {
        rawToken,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlMs),
    };
}

async function sendVerificationEmailSafely({ email, verificationToken }) {
    try {
        const result = await sendEmail({
            to: email,
            subject: 'Verify your email',
            html: createVerificationEmailHtml(createVerificationUrl(verificationToken)),
            text: [
                'Verify Your Email',
                'Please open the link below to verify your email address:',
                createVerificationUrl(verificationToken),
            ].join('\n'),
        });

        return !result?.skipped;
    } catch (error) {
        console.error(`[Auth] Verification email failed for ${email}:`, error.message);
        return false;
    }
}

async function signAuthToken(user, expiresIn) {
    if (!env.JWT_SECRET) {
        throw new Error('Server authentication is not configured');
    }

    return new Promise((resolve, reject) => {
        jwt.sign(
            createAuthPayload(user),
            env.JWT_SECRET,
            { expiresIn },
            (err, token) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(token);
            }
        );
    });
}

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const userId = req.user?.id ? Number(req.user.id) : null;

        if (!userId || Number.isNaN(userId)) {
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
                isVerified: true,
            },
        });

        if (!user) {
            return res.status(404).json({ msg: 'User no longer exists' });
        }

        return res.json(user);
    } catch (err) {
        console.error('Error in /api/auth/me:', err.message);
        return res.status(500).json({ msg: 'Server Error' });
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
        check('password', 'Password is required').exists(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, rememberMe } = req.body;
        const normalizedEmail = normalizeEmailInput(email);

        try {
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (!user || !user.password) {
                return res.status(400).json({ msg: GENERIC_LOGIN_ERROR });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: GENERIC_LOGIN_ERROR });
            }

            const expiresIn = rememberMe ? '30d' : '1d';
            const token = await signAuthToken(user, expiresIn);
            return res.json({ token });
        } catch (err) {
            console.error('Login error:', err.message);
            return res.status(500).json({ msg: 'Server Error' });
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
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;
        const normalizedEmail = normalizeEmailInput(email);

        try {
            let user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (user) {
                return res.status(400).json({ msg: 'An account with this email already exists.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const verificationTokenRecord = createTokenRecord({
                bytes: 20,
                ttlMs: VERIFICATION_TOKEN_TTL_MS,
            });

            user = await prisma.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    password: hashedPassword,
                    verificationToken: verificationTokenRecord.tokenHash,
                    verificationTokenExpires: verificationTokenRecord.expiresAt,
                    role: 'user',
                },
            });

            const verificationEmailSent = await sendVerificationEmailSafely({
                email: normalizedEmail,
                verificationToken: verificationTokenRecord.rawToken,
            });

            const response = {
                msg: 'Registration successful! You can log in now.',
            };

            if (verificationEmailSent) {
                response.emailNotice = 'We also sent a verification email if you would like to confirm your address.';
            }

            return res.json(response);
        } catch (err) {
            console.error('Register error:', err.message);
            return res.status(500).json({ msg: 'Server Error' });
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
        check('email', 'Please include a valid email').isEmail(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const normalizedEmail = normalizeEmailInput(req.body.email);

        try {
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (user && !user.isVerified) {
                const verificationTokenRecord = createTokenRecord({
                    bytes: 20,
                    ttlMs: VERIFICATION_TOKEN_TTL_MS,
                });

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        verificationToken: verificationTokenRecord.tokenHash,
                        verificationTokenExpires: verificationTokenRecord.expiresAt,
                    },
                });

                await sendVerificationEmailSafely({
                    email: normalizedEmail,
                    verificationToken: verificationTokenRecord.rawToken,
                });
            }

            return res.json({ msg: GENERIC_RESEND_VERIFICATION_RESPONSE });
        } catch (err) {
            console.error('Error in /api/auth/resend-verification:', err.message);
            return res.status(500).json({ msg: 'Server Error' });
        }
    }
);

// @route   POST api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
        return res.status(400).json({ msg: INVALID_OR_EXPIRED_TOKEN_MESSAGE });
    }

    try {
        const tokenHash = hashToken(token);
        const now = new Date();
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: tokenHash,
                verificationTokenExpires: { gt: now },
            },
        });

        if (!user) {
            return res.status(400).json({ msg: INVALID_OR_EXPIRED_TOKEN_MESSAGE });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null,
                verificationTokenExpires: null,
            },
        });

        return res.json({ msg: 'Email verified successfully! You can now log in.' });
    } catch (err) {
        console.error('Verify email error:', err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/google
// @desc    Google Login
// @access  Public
router.post('/google', async (req, res) => {
    const { token } = req.body;

    try {
        if (!token) {
            return res.status(400).json({ msg: 'Google credential is required.' });
        }

        if (!client || !GOOGLE_CLIENT_ID) {
            return res.status(503).json({ msg: 'Google sign-in is not configured on this server.' });
        }

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const { name, email, sub: googleId, picture } = ticket.getPayload() || {};

        if (!email || !googleId) {
            return res.status(400).json({ msg: 'Google account details are incomplete. Please try another account.' });
        }

        const normalizedEmail = normalizeEmailInput(email);
        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (user) {
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { email: normalizedEmail },
                    data: { googleId, profilePicture: user.profilePicture || picture },
                });
            }
        } else {
            user = await prisma.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    googleId,
                    profilePicture: picture,
                    password: null,
                    role: 'user',
                    isVerified: true,
                },
            });
        }

        const authToken = await signAuthToken(user, '30d');
        return res.json({ token: authToken });
    } catch (err) {
        console.error('Google Auth Error:', err.message);
        return res.status(400).json({ msg: 'Google sign-in failed. Please try again.' });
    }
});

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', forgotPasswordLimiter, [
    check('email', 'Please include a valid email').isEmail(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const normalizedEmail = normalizeEmailInput(req.body.email);

    try {
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (user && user.password) {
            const resetTokenRecord = createTokenRecord({
                ttlMs: PASSWORD_RESET_TOKEN_TTL_MS,
            });
            const resetUrl = `${env.CLIENT_URL}/reset-password/${resetTokenRecord.rawToken}`;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: resetTokenRecord.tokenHash,
                    passwordResetExpires: resetTokenRecord.expiresAt,
                },
            });

            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Password Reset Request',
                    html: createPasswordResetEmailHtml(resetUrl),
                    text: [
                        'Password Reset Request',
                        'You requested a password reset. Open the link below to reset your password:',
                        resetUrl,
                        'If you did not request this, you can safely ignore this email.',
                    ].join('\n'),
                });
            } catch (emailError) {
                console.error('Password reset email failed:', emailError.message);
            }
        }

        return res.json({ msg: GENERIC_FORGOT_PASSWORD_RESPONSE });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    const token = typeof req.params?.token === 'string' ? req.params.token.trim() : '';
    const { password } = req.body;

    if (!token) {
        return res.status(400).json({ msg: INVALID_OR_EXPIRED_TOKEN_MESSAGE });
    }

    if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters long.' });
    }

    try {
        const tokenHash = hashToken(token);
        const user = await prisma.user.findFirst({
            where: {
                passwordResetExpires: { gt: new Date() },
                OR: [
                    { passwordResetToken: tokenHash },
                    { passwordResetToken: token },
                ],
            },
        });

        if (!user) {
            return res.status(400).json({ msg: INVALID_OR_EXPIRED_TOKEN_MESSAGE });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
                passwordChangedAt: new Date(),
            },
        });

        return res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error('Reset password error:', err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
