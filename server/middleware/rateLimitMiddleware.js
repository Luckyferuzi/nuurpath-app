const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError'); // Assuming you have AppError

// Rate limiter for registration attempts:
// Allow 5 attempts within a 15-minute window for each IP address.
// This helps prevent rapid account creation.
exports.registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 create account requests per windowMs
    message: new AppError(
        'Too many accounts created from this IP, please try again after an hour',
        429 // HTTP status code for Too Many Requests
    ).message, // express-rate-limit expects a string message, not an AppError object directly.
    handler: (req, res, next, options) => {
        // Custom handler to ensure AppError format is used for the response
        res.status(options.statusCode).json({
            status: 'fail', // Or 'error' depending on your AppError status convention for 4xx
            message: options.message,
        });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for login attempts:
// Allow 10 attempts within a 5-minute window for each IP address.
// This helps mitigate brute-force login attempts.
exports.loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: new AppError(
        'Too many login attempts from this IP, please try again after 5 minutes',
        429
    ).message,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            status: 'fail',
            message: options.message,
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for password reset attempts:
// Allow 3 attempts within a 1-hour window.
exports.forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: new AppError(
        'Too many password reset attempts from this IP, please try again after an hour',
        429
    ).message,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            status: 'fail',
            message: options.message,
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});
