import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth rate limiter (stricter)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// OTP rate limiter
export const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 requests per minute
    message: {
        success: false,
        message: 'Too many OTP requests, please try again after 1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Search rate limiter
export const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: {
        success: false,
        message: 'Too many search requests, please slow down'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
        success: false,
        message: 'Upload limit exceeded, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});