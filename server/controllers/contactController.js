const sendEmail = require('../utils/emailService');
const { validationResult } = require('express-validator');
const axios = require('axios');

exports.submitContactForm = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message, captchaToken } = req.body;

    try {
        // Verify reCAPTCHA
        if (!captchaToken) {
            return res.status(400).json({ msg: 'Please complete the reCAPTCHA' });
        }

        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
        const verifyResponse = await axios.post(verifyUrl);

        if (!verifyResponse.data.success) {
            return res.status(400).json({ msg: 'reCAPTCHA verification failed' });
        }

        const emailContent = `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `;

        const emailOptions = {
            to: process.env.ADMIN_EMAIL,
            subject: `Contact Form: ${subject}`,
            html: emailContent
        };

        if (req.file) {
            emailOptions.attachments = [{
                filename: req.file.originalname,
                content: req.file.buffer
            }];
        }

        await sendEmail(emailOptions);

        res.json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error('Contact form error:', err.message);
        res.status(500).send('Server Error');
    }
};