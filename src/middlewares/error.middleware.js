import ApiError from '../utils/ApiError.js';

// Not found middleware
export const notFound = (req, res, next) => {
    const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
    next(error);
};

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
    let error = err;

    // If not an ApiError, convert it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, [], err.stack);
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
    console.log('🔴 ============ CAST ERROR ============');
    console.log('Path (field):', err.path);
    console.log('Value:', err.value);
    console.log('Value type:', typeof err.value);
    console.log('Kind:', err.kind);
    console.log('Message:', err.message);
    console.log('Stack:', err.stack);
    console.log('🔴 ====================================');
    error = new ApiError(400, 'Invalid ID format');
}

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        error = new ApiError(400, `${field} already exists`);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        error = new ApiError(400, 'Validation Error', errors);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new ApiError(401, 'Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new ApiError(401, 'Token expired');
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error(' Error:', error);
    }

    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};