// errorMiddleware.js
const AppError = require('../utils/AppError');

// Handler for Development environment errors (more details)
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack, // Include stack trace in development
    });
};

// Handler for Production environment errors (less details, more user-friendly)
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err); // Log the error for internal debugging

        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!', // Generic message
        });
    }
};

module.exports = (err, req, res, next) => {
    // Default status code and message if not set
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Differentiate error responses based on environment
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        // In a real application, you'd add more specific handlers for known
        // Mongoose errors (e.g., CastError, ValidationError, Duplicate Key Error)
        // to convert them into operational errors.
        // For simplicity, this example just uses the generic operational/programming split.

        let error = { ...err }; // Create a copy of the error object
        error.message = err.message; // Ensure message is copied if not enumerable

        sendErrorProd(error, res);
    }
};
