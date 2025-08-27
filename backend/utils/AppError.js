// AppError.js
class AppError extends Error {
    constructor(message, statusCode) {
        super(message); // Call the parent (Error) constructor with the message

        this.statusCode = statusCode;
        // Determine if the error is operational (expected) or a programming error
        // 'fail' for operational errors (client's fault) like 4xx
        // 'error' for programming errors (server's fault) like 5xx
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark this error as operational

        // Capture the stack trace to know where the error occurred
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
