import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config.js';
import ApiError from '../utils/ApiError.js';

class TokenService {
    // Generate access token
    generateAccessToken(payload) {
        return jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.expiresIn
        });
    }

    // Generate refresh token
    generateRefreshToken(payload) {
        return jwt.sign(payload, jwtConfig.refreshSecret, {
            expiresIn: jwtConfig.refreshExpiresIn
        });
    }

    // Generate both tokens
    generateTokens(user) {
        const payload = {
            id: user._id,
            role: user.role,
            mobile: user.mobile
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken({ id: user._id });

        return { accessToken, refreshToken };
    }

    // Verify access token
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, jwtConfig.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'Access token expired');
            }
            throw new ApiError(401, 'Invalid access token');
        }
    }

    // Verify refresh token
    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, jwtConfig.refreshSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new ApiError(401, 'Refresh token expired');
            }
            throw new ApiError(401, 'Invalid refresh token');
        }
    }

    // Decode token without verification
    decodeToken(token) {
        return jwt.decode(token);
    }
}

export default new TokenService();