const sendEmail = require('../utils/emailService');
const { validationResult } = require('express-validator');
const { formatPlainTextForHtml, sanitizeEmailHeaderValue } = require('../utils/security');

exports.submitContactForm = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
        const normalizedSubject = sanitizeEmailHeaderValue(subject, 'Contact Form Submission');
        const emailContent = `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${formatPlainTextForHtml(name)}</p>
            <p><strong>Email:</strong> ${formatPlainTextForHtml(email)}</p>
            <p><strong>Subject:</strong> ${formatPlainTextForHtml(subject)}</p>
            <p><strong>Message:</strong></p>
            <p>${formatPlainTextForHtml(message)}</p>
        `;

        const emailOptions = {
            to: process.env.ADMIN_EMAIL,
            subject: `Contact Form: ${normalizedSubject}`,
            html: emailContent,
            text: [
                'New Contact Form Submission',
                `Name: ${name}`,
                `Email: ${email}`,
                `Subject: ${normalizedSubject}`,
                'Message:',
                message,
            ].join('\n'),
        };

        if (req.file) {
            emailOptions.attachments = [{
                filename: sanitizeEmailHeaderValue(req.file.originalname, 'attachment'),
                content: req.file.buffer,
                contentType: req.file.mimetype,
            }];
        }

        await sendEmail(emailOptions);

        res.json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error('Contact form error:', err.message);
        res.status(500).send('Server Error');
    }
};
