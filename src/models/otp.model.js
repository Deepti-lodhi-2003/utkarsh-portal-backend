import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['registration', 'login', 'forgot_password', 'mobile_verification', 'change_mobile'],
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index - auto delete when expired
    },
    verifiedAt: Date,
    twilioSid: String, // Store Twilio verification SID
    metadata: {
        ip: String,
        userAgent: String
    }
}, {
    timestamps: true
});

// Check if OTP is expired
otpSchema.methods.isExpired = function() {
    return Date.now() > this.expiresAt;
};

// Check if max attempts exceeded
otpSchema.methods.isMaxAttemptsExceeded = function() {
    return this.attempts >= this.maxAttempts;
};

// Increment attempts
otpSchema.methods.incrementAttempts = async function() {
    this.attempts += 1;
    await this.save();
};

export default mongoose.model('OTP', otpSchema);