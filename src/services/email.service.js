import nodemailer from 'nodemailer';
import ApiError from '../utils/ApiError.js';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Send email
    async sendEmail({ to, subject, html, text }) {
        try {
            const mailOptions = {
                from: `"Utkarsh Ujjain" <${process.env.SMTP_USER}>`,
                to,
                subject,
                text,
                html
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(` Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error(' Email Error:', error.message);
            throw new ApiError(500, `Failed to send email: ${error.message}`);
        }
    }

    // Welcome email
    async sendWelcomeEmail(user) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1a56db;">Welcome to Utkarsh Ujjain! </h1>
                <p>Hello ${user.name},</p>
                <p>Thank you for registering with Utkarsh Ujjain. We're excited to have you on board!</p>
                <p>You can now:</p>
                <ul>
                    <li>Search and apply for jobs</li>
                    <li>Enroll in training programs</li>
                    <li>Connect with industries and vendors</li>
                </ul>
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        return this.sendEmail({
            to: user.email,
            subject: 'Welcome to Utkarsh Ujjain!',
            html
        });
    }

    // Application confirmation
    async sendApplicationConfirmation(user, job) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">Application Submitted Successfully!</h2>
                <p>Hello ${user.name},</p>
                <p>Your application for <strong>${job.title}</strong> has been submitted successfully.</p>
                <p><strong>Company:</strong> ${job.institution?.organizationName}</p>
                <p><strong>Location:</strong> ${job.location?.city}</p>
                <p>We will notify you about any updates on your application.</p>
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        return this.sendEmail({
            to: user.email,
            subject: `Application Submitted: ${job.title}`,
            html
        });
    }

    // Application status update
    async sendApplicationStatusUpdate(user, job, status) {
        const statusMessages = {
            shortlisted: 'Congratulations! You have been shortlisted.',
            interview_scheduled: 'An interview has been scheduled.',
            offered: 'Congratulations! You have received a job offer.',
            rejected: 'Unfortunately, your application was not selected.',
            hired: 'Congratulations! You have been hired.'
        };

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">Application Status Update</h2>
                <p>Hello ${user.name},</p>
                <p>Your application for <strong>${job.title}</strong> has been updated.</p>
                <p><strong>Status:</strong> ${status.toUpperCase()}</p>
                <p>${statusMessages[status] || ''}</p>
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        return this.sendEmail({
            to: user.email,
            subject: `Application Update: ${job.title}`,
            html
        });
    }

    // Training enrollment confirmation
    async sendTrainingEnrollmentConfirmation(user, training) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a56db;">Training Enrollment Confirmed!</h2>
                <p>Hello ${user.name},</p>
                <p>You have successfully enrolled in <strong>${training.title}</strong>.</p>
                <p><strong>Start Date:</strong> ${new Date(training.startDate).toLocaleDateString()}</p>
                <p><strong>Mode:</strong> ${training.mode}</p>
                ${training.mode !== 'online' ? `<p><strong>Venue:</strong> ${training.venue?.address}, ${training.venue?.city}</p>` : ''}
                <p>Best regards,<br>Team Utkarsh Ujjain</p>
            </div>
        `;

        return this.sendEmail({
            to: user.email,
            subject: `Enrollment Confirmed: ${training.title}`,
            html
        });
    }
}

export default new EmailService();