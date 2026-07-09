const rateLimit = require('express-rate-limit');

function createJsonRateLimiter({ windowMs, max, message }) {
    return rateLimit({
        windowMs,
        max,
        message,
        handler: (req, res, next, options) => {
            res.status(options.statusCode).json({
                status: 'fail',
                message: options.message,
            });
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
}

exports.registerLimiter = createJsonRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many accounts created from this IP. Please try again later.',
});

exports.loginLimiter = createJsonRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts from this IP. Please try again after 5 minutes.',
});

exports.forgotPasswordLimiter = createJsonRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many password reset attempts from this IP. Please try again after an hour.',
});

exports.resendVerificationLimiter = createJsonRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many verification email requests from this IP. Please try again after an hour.',
});

exports.contactFormLimiter = createJsonRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many contact form submissions from this IP. Please try again later.',
});

exports.privateConsultationLimiter = createJsonRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many consultation requests from this IP. Please try again later.',
});

exports.packageRequestLimiter = createJsonRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many package requests from this IP. Please try again later.',
});

exports.flightRequestLimiter = createJsonRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many flight requests from this IP. Please try again later.',
});

exports.serviceInquiryLimiter = createJsonRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many service requests from this IP. Please try again later.',
});
