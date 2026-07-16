const nodemailer = require('nodemailer');
const env = require('../config/env');
const {
    escapeHtml,
    formatPlainTextForHtml,
    sanitizeEmailHeaderValue,
} = require('./security');

let cachedTransporter = null;
let cachedTransporterKey = '';

function normalizeEmailOptions(optionsOrTo, legacySubject, legacyHtml, legacyAttachments) {
    if (typeof optionsOrTo === 'string') {
        return {
            to: optionsOrTo,
            subject: legacySubject,
            html: legacyHtml,
            attachments: legacyAttachments,
        };
    }

    const options = optionsOrTo && typeof optionsOrTo === 'object' ? optionsOrTo : {};

    return {
        to: options.to || options.email,
        subject: options.subject,
        text: options.text || options.message,
        html: options.html,
        attachments: options.attachments,
    };
}

function getEmailConfig() {
    const port = Number.parseInt(process.env.EMAIL_PORT, 10);
    const missing = [];

    if (!process.env.EMAIL_HOST || !String(process.env.EMAIL_HOST).trim()) {
        missing.push('EMAIL_HOST');
    }

    if (!Number.isInteger(port) || port <= 0) {
        missing.push('EMAIL_PORT');
    }

    if (!process.env.EMAIL_USER || !String(process.env.EMAIL_USER).trim()) {
        missing.push('EMAIL_USER');
    }

    if (!process.env.EMAIL_PASS || !String(process.env.EMAIL_PASS).trim()) {
        missing.push('EMAIL_PASS');
    }

    if (missing.length > 0) {
        const error = new Error(`Email service is not configured. Missing: ${missing.join(', ')}`);
        error.code = 'EMAIL_CONFIG_MISSING';
        error.missing = missing;

        if (env.isProduction) {
            throw error;
        }

        console.warn(`[EmailService] ${error.message}. Skipping email in development.`);
        return null;
    }

    return {
        host: process.env.EMAIL_HOST,
        port,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM || `"NuurPath Travels" <${process.env.EMAIL_USER}>`,
    };
}

function getEmailServiceAvailability() {
    try {
        const config = getEmailConfig();

        if (!config) {
            return {
                configured: false,
                reason: 'Email delivery is unavailable until the mail service is configured.',
            };
        }

        return {
            configured: true,
        };
    } catch (error) {
        return {
            configured: false,
            reason: error.message || 'Email delivery is unavailable until the mail service is configured.',
            missing: error.missing || [],
        };
    }
}

function createTransporter(config) {
    return nodemailer.createTransport({
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
}

function buildTransporterKey(config) {
    return [
        config.host,
        config.port,
        config.user,
        config.from,
    ].join('|');
}

function getTransporter(config) {
    const nextTransporterKey = buildTransporterKey(config);

    if (!cachedTransporter || cachedTransporterKey !== nextTransporterKey) {
        cachedTransporter = createTransporter(config);
        cachedTransporterKey = nextTransporterKey;
    }

    return cachedTransporter;
}

function requireNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${fieldName} is required.`);
    }

    return value.trim();
}

function formatBookingDate(value) {
    if (!value) {
        return 'To be confirmed';
    }

    const parsed = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return 'To be confirmed';
    }

    return parsed.toDateString();
}

async function sendEmail(optionsOrTo, legacySubject, legacyHtml, legacyAttachments) {
    const options = normalizeEmailOptions(optionsOrTo, legacySubject, legacyHtml, legacyAttachments);
    const to = requireNonEmptyString(options.to, 'Email recipient');
    const subject = sanitizeEmailHeaderValue(requireNonEmptyString(options.subject, 'Email subject'));
    const text = typeof options.text === 'string' ? options.text.trim() : '';
    const html = typeof options.html === 'string' ? options.html : '';

    if (!text && !html) {
        throw new Error('Email text or html content is required.');
    }

    const config = getEmailConfig();
    if (!config) {
        return {
            success: false,
            skipped: true,
            reason: 'Email service is not configured in development.',
        };
    }

    const mailOptions = {
        from: config.from,
        to,
        subject,
    };

    if (text) {
        mailOptions.text = text;
    }

    if (html) {
        mailOptions.html = html;
    }

    if (Array.isArray(options.attachments) && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments;
    }

    try {
        const info = await getTransporter(config).sendMail(mailOptions);
        console.log(`[EmailService] Email sent to ${to}`);
        return info;
    } catch (error) {
        console.error('[EmailService] Failed to send email:', error.message);
        throw error;
    }
}

async function sendBookingConfirmationEmail(booking, pdfBuffer) {
    if (!booking || typeof booking !== 'object') {
        throw new Error('Booking details are required.');
    }

    const recipient = booking.contactEmail || booking.user?.email;
    const contactName = booking.contactName || booking.user?.name || 'Customer';
    const packageLabel = booking.package?.title
        || booking.packageTitleSnapshot
        || (booking.packageId ? `Package #${booking.packageId}` : 'your package');
    const bookingReference = booking.id ? `#${booking.id}` : 'your booking';
    const travelDate = formatBookingDate(booking.travelDate);
    const status = booking.status || 'Confirmed';
    const safeContactName = escapeHtml(contactName);
    const safePackageLabel = escapeHtml(packageLabel);
    const safeBookingReference = escapeHtml(bookingReference);
    const safeTravelDate = escapeHtml(travelDate);
    const safeStatus = escapeHtml(status);

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #0B1C3E;">Booking Confirmation</h2>
            <p>Dear <strong>${safeContactName}</strong>,</p>
            <p>Your booking request has been confirmed by the NuurPath Travels team.</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Booking ID:</strong> ${safeBookingReference}</p>
                <p><strong>Package:</strong> ${safePackageLabel}</p>
                <p><strong>Travel Date:</strong> ${safeTravelDate}</p>
                <p><strong>Status:</strong> ${safeStatus}</p>
            </div>
            <p>Please keep this email for your records. If you have any questions, reply to this message or contact our team.</p>
            <p>Best regards,<br><strong>NuurPath Travels Team</strong></p>
        </div>
    `;

    const attachments = Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0
        ? [{
            filename: `booking-${booking.id || 'confirmation'}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        }]
        : undefined;

    return sendEmail({
        to: requireNonEmptyString(recipient, 'Booking confirmation email recipient'),
        subject: `Booking Confirmed - ${sanitizeEmailHeaderValue(bookingReference, 'Booking Confirmation')}`,
        html,
        text: [
            `Dear ${contactName},`,
            'Your booking request has been confirmed by the NuurPath Travels team.',
            `Booking ID: ${bookingReference}`,
            `Package: ${packageLabel}`,
            `Travel Date: ${travelDate}`,
            `Status: ${status}`,
            'Please keep this email for your records. If you have any questions, reply to this message or contact our team.',
            'Best regards,',
            'NuurPath Travels Team',
        ].join('\n'),
        attachments,
    });
}

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendBookingConfirmationEmail = sendBookingConfirmationEmail;
module.exports.getEmailServiceAvailability = getEmailServiceAvailability;
module.exports.escapeHtml = escapeHtml;
module.exports.formatPlainTextForHtml = formatPlainTextForHtml;
