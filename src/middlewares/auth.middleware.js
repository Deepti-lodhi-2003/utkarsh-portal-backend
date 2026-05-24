import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { jwtConfig } from '../config/jwt.config.js';

export const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new ApiError(401, 'Not authorized, no token provided');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, jwtConfig.secret);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            throw new ApiError(401, 'User not found');
        }

        if (!user.isActive) {
            throw new ApiError(401, 'User account is deactivated');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Token expired, please login again');
        }
        throw new ApiError(401, 'Not authorized, invalid token');
    }
});

// Optional auth - doesn't throw error if no token
export const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, jwtConfig.secret);
            const user = await User.findById(decoded.id).select('-password');
            if (user && user.isActive) {
                req.user = user;
            }
        } catch (error) {
            // Silently ignore invalid tokens for optional auth
        }
    }

    next();
});

// Verify mobile middleware
export const verifyMobile = asyncHandler(async (req, res, next) => {
    if (!req.user.isMobileVerified) {
        throw new ApiError(403, 'Please verify your mobile number first');
    }
    next();
});