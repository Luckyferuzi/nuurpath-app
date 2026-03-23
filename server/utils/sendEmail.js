const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const sendEmail = async (options) => {
    // 1) Create a transporter
    // For production, use a real service like SendGrid, Mailgun, etc.
    // For development, using Mailtrap is a great choice.
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2) Define the email options
    const mailOptions = {
        from: process.env.EMAIL_FROM || '"NuurPath Travels" <noreply@nuurpath.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    // 3) Render HTML template if provided
    if (options.template) {
        try {
            const templatePath = path.join(__dirname, '../views', `${options.template}.ejs`);
            const html = await ejs.renderFile(templatePath, {
                ...(options.data || {}),
                unsubscribeUrl: options.unsubscribeUrl
            });
            mailOptions.html = html;
        } catch (err) {
            console.error('Error rendering email template:', err);
        }
    }

    // 4) Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;