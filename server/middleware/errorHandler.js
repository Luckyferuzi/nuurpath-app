const multer = require('multer');
const { Prisma } = require('@prisma/client');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const logger = require('../utils/logger');

function buildAppError(message, statusCode, code, details) {
    return new AppError(message, statusCode, code, details);
}

function getDefaultCodeForStatus(statusCode) {
    if (statusCode === 400) {
        return 'VALIDATION_ERROR';
    }

    if (statusCode === 401) {
        return 'UNAUTHORIZED';
    }

    if (statusCode === 403) {
        return 'FORBIDDEN';
    }

    if (statusCode === 404) {
        return 'NOT_FOUND';
    }

    if (statusCode === 409) {
        return 'DUPLICATE_VALUE';
    }

    if (statusCode === 429) {
        return 'RATE_LIMITED';
    }

    return statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
}

function isPrismaKnownRequestError(error) {
    return Prisma?.PrismaClientKnownRequestError && error instanceof Prisma.PrismaClientKnownRequestError;
}

function isPrismaValidationError(error) {
    return Prisma?.PrismaClientValidationError && error instanceof Prisma.PrismaClientValidationError;
}

function isJwtError(error) {
    return error && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name);
}

function isCorsOriginError(error) {
    return error && typeof error.message === 'string' && error.message.startsWith('Origin not allowed by CORS');
}

function isInvalidJsonError(error) {
    return error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body');
}

function isInvalidFileError(error) {
    if (!error || typeof error.message !== 'string') {
        return false;
    }

    return error.message.startsWith('Invalid file type')
        || error.message.includes('Only PDF')
        || error.message.includes('Only image files')
        || error.message.includes('Only PDF, JPEG, PNG, and WebP');
}

function mapKnownError(error) {
    if (error instanceof AppError) {
        if (error.code === 'INTERNAL_ERROR' && error.statusCode < 500) {
            error.code = getDefaultCodeForStatus(error.statusCode);
        }

        return error;
    }

    if (isPrismaKnownRequestError(error)) {
        if (error.code === 'P2002') {
            return buildAppError('A record with that value already exists.', 409, 'DUPLICATE_VALUE', {
                target: error.meta?.target,
            });
        }

        if (error.code === 'P2025') {
            return buildAppError('Requested resource was not found.', 404, 'NOT_FOUND');
        }

        return buildAppError('Database request failed.', 500, 'DATABASE_ERROR');
    }

    if (isPrismaValidationError(error)) {
        return buildAppError('Invalid data provided.', 400, 'VALIDATION_ERROR');
    }

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return buildAppError('File too large.', 400, 'FILE_TOO_LARGE');
        }

        return buildAppError(error.message || 'Invalid file upload.', 400, 'INVALID_FILE');
    }

    if (isInvalidFileError(error)) {
        return buildAppError(error.message, 400, 'INVALID_FILE');
    }

    if (isJwtError(error)) {
        return buildAppError('Token is invalid or expired.', 401, 'INVALID_TOKEN');
    }

    if (isCorsOriginError(error)) {
        return buildAppError('CORS origin not allowed', 403, 'CORS_ORIGIN_NOT_ALLOWED');
    }

    if (isInvalidJsonError(error)) {
        return buildAppError('Invalid JSON payload.', 400, 'INVALID_JSON');
    }

    if (error && Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600) {
        return buildAppError(
            error.message || (error.statusCode >= 500 ? 'Server Error' : 'Request failed.'),
            error.statusCode,
            error.code || getDefaultCodeForStatus(error.statusCode),
            error.details
        );
    }

    const unexpectedError = buildAppError('Server Error', 500, 'INTERNAL_ERROR');
    unexpectedError.isOperational = false;
    return unexpectedError;
}

module.exports = function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const normalizedError = mapKnownError(err);
    const statusCode = normalizedError.statusCode || 500;
    const requestId = req.id || req.requestId;
    const logMeta = {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        code: normalizedError.code,
        userId: req.user?.id,
        error: err,
    };

    if (statusCode >= 500) {
        logger.error('request_error', logMeta);
    } else {
        logger.warn('request_error', logMeta);
    }

    const responseBody = {
        success: false,
        code: normalizedError.code || 'INTERNAL_ERROR',
        message: normalizedError.message || 'Server Error',
        requestId,
    };

    if (!env.isProduction) {
        if (normalizedError.details !== undefined) {
            responseBody.details = normalizedError.details;
        } else if (err && err.details !== undefined) {
            responseBody.details = err.details;
        }

        if (err && err.stack) {
            responseBody.stack = err.stack;
        }
    }

    return res.status(statusCode).json(responseBody);
};
