const sendEmail = require('../utils/emailService');
const { validationResult } = require('express-validator');

exports.submitContactForm = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
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
