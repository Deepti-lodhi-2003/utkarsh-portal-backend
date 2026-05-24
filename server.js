
import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.config.js';

connectDB();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV}`);
    console.log(` Twilio OTP Service: Active`);
    console.log(` Global Search: Active`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(` Error: ${err.message}`);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(` Uncaught Exception: ${err.message}`);
    process.exit(1);
});