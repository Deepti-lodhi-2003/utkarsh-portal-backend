import OTP from '../models/otp.model.js';
import twilioService from './twilio.service.js';
import ApiError from '../utils/ApiError.js';
import { generateOTP } from '../utils/helpers.js';

class OTPService {
    constructor() {
        this.otpExpireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
        this.maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS) || 3;
        this.resendInterval = parseInt(process.env.OTP_RESEND_INTERVAL) || 60; // seconds
        this.useMockOTP = process.env.USE_MOCK_OTP === 'true'; // For development
    }

    // Generate and send OTP
    async sendOTP(mobile, purpose, metadata = {}) {
        try {
            // Check for existing recent OTP
            const recentOTP = await OTP.findOne({
                mobile,
                purpose,
                createdAt: { $gte: new Date(Date.now() - this.resendInterval * 1000) }
            });

            if (recentOTP) {
                const waitTime = Math.ceil(
                    (this.resendInterval * 1000 - (Date.now() - recentOTP.createdAt)) / 1000
                );
                throw new ApiError(429, `Please wait ${waitTime} seconds before requesting new OTP`);
            }

            // Delete any existing OTPs for this mobile and purpose
            await OTP.deleteMany({ mobile, purpose });

            let otpCode;
            let twilioSid = null;

            // Use mock OTP in development or real Twilio in production
            if (this.useMockOTP && process.env.NODE_ENV === 'development') {
                // Generate mock OTP for development
                otpCode = generateOTP(6); // 6-digit OTP
                
                console.log('==========================================');
                console.log('📱 OTP SENT (DEVELOPMENT MODE)');
                console.log('==========================================');
                console.log('Mobile:', mobile);
                console.log('🔢 OTP Code:', otpCode);
                console.log('Purpose:', purpose);
                console.log('Expires In:', this.otpExpireMinutes, 'minutes');
                console.log('==========================================');
            } else {
                // Send OTP via Twilio (Production)
                const twilioResponse = await twilioService.sendOTP(mobile);
                twilioSid = twilioResponse.sid;
                otpCode = 'TWILIO_VERIFY'; // Twilio manages the actual OTP

                if (process.env.NODE_ENV === 'development') {
                    console.log('==========================================');
                    console.log('📱 OTP SENT VIA TWILIO');
                    console.log('==========================================');
                    console.log('Mobile:', mobile);
                    console.log('Purpose:', purpose);
                    console.log('Twilio SID:', twilioSid);
                    console.log('Expires In:', this.otpExpireMinutes, 'minutes');
                    console.log('⚠️  Check Twilio console for actual OTP');
                    console.log('==========================================');
                }
            }

            // Save OTP record in database
            const otpDoc = await OTP.create({
                mobile,
                otp: otpCode,
                purpose,
                twilioSid,
                expiresAt: new Date(Date.now() + this.otpExpireMinutes * 60 * 1000),
                maxAttempts: this.maxAttempts,
                metadata
            });

            return {
                success: true,
                message: 'OTP sent successfully',
                expiresIn: this.otpExpireMinutes * 60,
                otpId: otpDoc._id,
                ...(this.useMockOTP && process.env.NODE_ENV === 'development' && { otp: otpCode }) // Return OTP in dev mode
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, `Failed to send OTP: ${error.message}`);
        }
    }

    // Verify OTP
    async verifyOTP(mobile, code, purpose) {
        try {
            // Find OTP record
            const otpDoc = await OTP.findOne({
                mobile,
                purpose,
                isVerified: false
            }).sort({ createdAt: -1 });

            if (!otpDoc) {
                throw new ApiError(400, 'OTP not found or expired. Please request a new one.');
            }

            // Check if expired
            if (otpDoc.isExpired()) {
                await OTP.deleteOne({ _id: otpDoc._id });
                throw new ApiError(400, 'OTP has expired. Please request a new one.');
            }

            // Check max attempts
            if (otpDoc.isMaxAttemptsExceeded()) {
                await OTP.deleteOne({ _id: otpDoc._id });
                throw new ApiError(400, 'Maximum verification attempts exceeded. Please request a new OTP.');
            }

            let isValid = false;

            // Verify OTP based on mode
            if (this.useMockOTP && process.env.NODE_ENV === 'development') {
                // Mock verification - compare with stored OTP
                isValid = otpDoc.otp === code;
                
                console.log('==========================================');
                console.log(isValid ? 'OTP VERIFIED (MOCK)' : ' OTP VERIFICATION FAILED (MOCK)');
                console.log('==========================================');
                console.log('Mobile:', mobile);
                console.log('Code Entered:', code);
                console.log('Expected OTP:', otpDoc.otp);
                console.log('Match:', isValid ? 'YES ✓' : 'NO ✗');
                if (!isValid) {
                    const remainingAttempts = otpDoc.maxAttempts - (otpDoc.attempts + 1);
                    console.log('Remaining Attempts:', remainingAttempts);
                }
                console.log('==========================================');
            } else {
                // Verify with Twilio
                const verifyResult = await twilioService.verifyOTP(mobile, code);
                isValid = verifyResult.success;

                console.log('==========================================');
                console.log(isValid ? ' OTP VERIFIED (TWILIO)' : ' OTP VERIFICATION FAILED (TWILIO)');
                console.log('==========================================');
                console.log('Mobile:', mobile);
                console.log('Code Entered:', code);
                if (!isValid) {
                    const remainingAttempts = otpDoc.maxAttempts - (otpDoc.attempts + 1);
                    console.log('Remaining Attempts:', remainingAttempts);
                }
                console.log('==========================================');
            }

            if (!isValid) {
                await otpDoc.incrementAttempts();
                const remainingAttempts = otpDoc.maxAttempts - otpDoc.attempts;
                throw new ApiError(400, `Invalid OTP. ${remainingAttempts} attempts remaining.`);
            }

            // Mark as verified
            otpDoc.isVerified = true;
            otpDoc.verifiedAt = new Date();
            await otpDoc.save();

            return {
                success: true,
                message: 'OTP verified successfully'
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, `OTP verification failed: ${error.message}`);
        }
    }

    // Resend OTP
    async resendOTP(mobile, purpose, metadata = {}) {
        return this.sendOTP(mobile, purpose, metadata);
    }

    // Check OTP status
    async checkOTPStatus(mobile, purpose) {
        const otpDoc = await OTP.findOne({
            mobile,
            purpose,
            isVerified: false
        }).sort({ createdAt: -1 });

        if (!otpDoc) {
            return { exists: false };
        }

        return {
            exists: true,
            isExpired: otpDoc.isExpired(),
            attemptsRemaining: otpDoc.maxAttempts - otpDoc.attempts,
            expiresAt: otpDoc.expiresAt
        };
    }
}

export default new OTPService();