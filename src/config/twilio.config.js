import twilio from 'twilio';


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let twilioClient = null;

try {
    twilioClient = twilio(accountSid, authToken);
    console.log(' Twilio Client Initialized');
} catch (error) {
    console.error(' Twilio initialization failed:', error.message);
}

export const twilioConfig = {
    client: twilioClient,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID
};

export default twilioClient;