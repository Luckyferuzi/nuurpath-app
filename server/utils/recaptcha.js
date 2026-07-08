const axios = require('axios');
const env = require('../config/env');
const AppError = require('./AppError');
const logger = require('./logger');

async function verifyRecaptchaToken(token, remoteIp) {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';

    if (!normalizedToken) {
        throw new AppError('Please complete the reCAPTCHA check.', 400, 'RECAPTCHA_REQUIRED');
    }

    const secret = String(env.RECAPTCHA_SECRET_KEY || '').trim();

    if (!secret) {
        if (env.isProduction) {
            throw new AppError('This form is temporarily unavailable. Please try again later.', 503, 'RECAPTCHA_NOT_CONFIGURED');
        }

        logger.warn('recaptcha_secret_missing', { remoteIp });
        return { skipped: true };
    }

    const payload = new URLSearchParams({
        secret,
        response: normalizedToken,
    });

    if (remoteIp) {
        payload.append('remoteip', remoteIp);
    }

    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            payload.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        if (!response.data?.success) {
            logger.warn('recaptcha_verification_failed', {
                remoteIp,
                errorCodes: response.data?.['error-codes'],
            });
            throw new AppError('reCAPTCHA verification failed.', 400, 'RECAPTCHA_FAILED');
        }

        return response.data;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error('recaptcha_verification_error', { remoteIp, error });
        throw new AppError('Unable to verify reCAPTCHA. Please try again.', 502, 'RECAPTCHA_UNAVAILABLE');
    }
}

module.exports = {
    verifyRecaptchaToken,
};
