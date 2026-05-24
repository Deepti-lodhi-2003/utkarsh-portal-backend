import express from 'express';
import {
    sendOTP,
    verifyOTP,
    resendOTP,
    registerCandidate,
    registerInstitution,
    login,
    loginWithOTP,
    resetPassword,
    changePassword,
    refreshToken,
    logout,
    getMe,
    updateProfile
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
    sendOTPSchema,
    verifyOTPSchema,
    registerCandidateSchema,
    registerInstitutionSchema,
    loginSchema,
    loginWithOTPSchema,
    resetPasswordSchema,
    changePasswordSchema,
    refreshTokenSchema
} from '../validators/auth.validator.js';

const router = express.Router();

// OTP Routes
router.post('/send-otp', otpLimiter, validate(sendOTPSchema), sendOTP);
router.post('/verify-otp', otpLimiter, validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', otpLimiter, validate(sendOTPSchema), resendOTP);

// Registration Routes
router.post('/register/candidate', authLimiter, validate(registerCandidateSchema), registerCandidate);
router.post('/register/institution', authLimiter, validate(registerInstitutionSchema), registerInstitution);

// Login Routes
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/login-otp', authLimiter, validate(loginWithOTPSchema), loginWithOTP);

// Password Routes
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);

// Token Routes
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/logout', protect, logout);

// Profile Routes
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);

export default router;