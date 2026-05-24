import { twilioConfig } from '../config/twilio.config.js';
import ApiError from '../utils/ApiError.js';

class TwilioService {
    constructor() {
        this.client = twilioConfig.client;
        this.verifyServiceSid = twilioConfig.verifyServiceSid;
        this.phoneNumber = twilioConfig.phoneNumber;
    }

    // Format phone number for India
    formatPhoneNumber(mobile) {
        const cleaned = mobile.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `+91${cleaned}`;
        } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
            return `+${cleaned}`;
        }
        return mobile;
    }

    // Send OTP using Twilio Verify Service
    async sendOTP(mobile) {
        try {
            const formattedNumber = this.formatPhoneNumber(mobile);

            const verification = await this.client.verify.v2
                .services(this.verifyServiceSid)
                .verifications.create({
                    to: formattedNumber,
                    channel: 'sms'
                });

            console.log(` OTP sent to ${formattedNumber}, SID: ${verification.sid}`);

            return {
                success: true,
                sid: verification.sid,
                status: verification.status,
                to: formattedNumber
            };
        } catch (error) {
            console.error(' Twilio Send OTP Error:', error.message);
            throw new ApiError(500, `Failed to send OTP: ${error.message}`);
        }
    }

    // Verify OTP using Twilio Verify Service
    async verifyOTP(mobile, code) {
        try {
            const formattedNumber = this.formatPhoneNumber(mobile);

            const verificationCheck = await this.client.verify.v2
                .services(this.verifyServiceSid)
                .verificationChecks.create({
                    to: formattedNumber,
                    code: code
                });

            console.log(` OTP verification status: ${verificationCheck.status}`);

            return {
                success: verificationCheck.status === 'approved',
                status: verificationCheck.status,
                sid: verificationCheck.sid
            };
        } catch (error) {
            console.error(' Twilio Verify OTP Error:', error.message);
            throw new ApiError(500, `Failed to verify OTP: ${error.message}`);
        }
    }

    // Send custom SMS (for notifications)
    async sendSMS(mobile, message) {
        try {
            const formattedNumber = this.formatPhoneNumber(mobile);

            const sms = await this.client.messages.create({
                body: message,
                from: this.phoneNumber,
                to: formattedNumber
            });

            console.log(` SMS sent to ${formattedNumber}, SID: ${sms.sid}`);

            return {
                success: true,
                sid: sms.sid,
                status: sms.status
            };
        } catch (error) {
            console.error(' Twilio Send SMS Error:', error.message);
            throw new ApiError(500, `Failed to send SMS: ${error.message}`);
        }
    }

    // Send WhatsApp message (if enabled)
    async sendWhatsApp(mobile, message) {
        try {
            const formattedNumber = this.formatPhoneNumber(mobile);

            const whatsapp = await this.client.messages.create({
                body: message,
                from: `whatsapp:${this.phoneNumber}`,
                to: `whatsapp:${formattedNumber}`
            });

            return {
                success: true,
                sid: whatsapp.sid,
                status: whatsapp.status
            };
        } catch (error) {
            console.error(' Twilio WhatsApp Error:', error.message);
            throw new ApiError(500, `Failed to send WhatsApp: ${error.message}`);
        }
    }
}

export default new TwilioService();