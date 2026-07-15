const {
    escapeHtml,
    formatPlainTextForHtml,
    sanitizeEmailHeaderValue,
} = require('./security');
const { toTrimmedString } = require('./validation');

const AUDIENCE_TYPES = ['USERS', 'SUBSCRIBERS', 'BOTH'];
const MESSAGE_TYPES = ['PROFESSIONAL_UPDATE', 'CAMPAIGN', 'OFFER'];
const GREETING_STYLES = ['DEAR', 'HELLO', 'WARM'];
const CAMPAIGN_STATUS = {
    DRAFT: 'Draft',
    SENDING: 'Sending',
    SENT: 'Sent',
    FAILED: 'Failed',
};

function normalizeSingleLine(value) {
    return toTrimmedString(value).replace(/\s+/g, ' ');
}

function normalizeMultiline(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trim();
}

function validateEnum(value, allowedValues, fieldName, fallback) {
    const normalized = normalizeSingleLine(value).toUpperCase();

    if (!normalized) {
        return fallback;
    }

    if (!allowedValues.includes(normalized)) {
        throw new Error(`${fieldName} is invalid.`);
    }

    return normalized;
}

function validateOptionalUrl(value) {
    const normalized = normalizeSingleLine(value);

    if (!normalized) {
        return '';
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(normalized);
    } catch (error) {
        throw new Error('CTA link must be a valid URL.');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('CTA link must start with http:// or https://.');
    }

    return normalized;
}

function validateRequiredField(value, label, maxLength) {
    const normalized = normalizeMultiline(value);

    if (!normalized) {
        throw new Error(`${label} is required.`);
    }

    if (maxLength && normalized.length > maxLength) {
        throw new Error(`${label} must be ${maxLength} characters or fewer.`);
    }

    return normalized;
}

function validateOptionalField(value, maxLength) {
    const normalized = normalizeMultiline(value);

    if (!normalized) {
        return '';
    }

    if (maxLength && normalized.length > maxLength) {
        throw new Error(`Field must be ${maxLength} characters or fewer.`);
    }

    return normalized;
}

function normalizeCampaignPayload(payload = {}) {
    const ctaLabel = validateOptionalField(payload.ctaLabel, 80);
    const ctaUrl = validateOptionalUrl(payload.ctaUrl);

    if (ctaLabel && !ctaUrl) {
        throw new Error('CTA link is required when a CTA label is provided.');
    }

    if (!ctaLabel && ctaUrl) {
        throw new Error('CTA label is required when a CTA link is provided.');
    }

    return {
        internalName: validateRequiredField(payload.internalName, 'Campaign name', 120),
        subject: sanitizeEmailHeaderValue(validateRequiredField(payload.subject, 'Email subject', 160)),
        audienceType: validateEnum(payload.audienceType, AUDIENCE_TYPES, 'Audience type', 'BOTH'),
        messageType: validateEnum(payload.messageType, MESSAGE_TYPES, 'Message type', 'PROFESSIONAL_UPDATE'),
        greetingStyle: validateEnum(payload.greetingStyle, GREETING_STYLES, 'Greeting style', 'DEAR'),
        title: validateRequiredField(payload.title, 'Message title', 160),
        preheader: validateOptionalField(payload.preheader, 180),
        body: validateRequiredField(payload.body, 'Main message', 4000),
        highlightTitle: validateOptionalField(payload.highlightTitle, 140),
        highlightBody: validateOptionalField(payload.highlightBody, 1200),
        ctaLabel,
        ctaUrl,
        signature: validateRequiredField(payload.signature, 'Signature', 240),
        status: CAMPAIGN_STATUS.DRAFT,
    };
}

function normalizePreviewRecipient(recipient = {}) {
    const fullName = normalizeSingleLine(recipient.name);
    const email = normalizeSingleLine(recipient.email).toLowerCase();
    const preferredName = fullName || 'Valued Traveler';
    const firstName = preferredName === 'Valued Traveler'
        ? preferredName
        : preferredName.split(' ')[0];

    return {
        name: preferredName,
        fullName: preferredName,
        firstName,
        email: email || 'traveler@example.com',
    };
}

function replaceTokens(value, recipient) {
    if (typeof value !== 'string' || !value) {
        return '';
    }

    return value
        .replace(/\{firstName\}/g, recipient.firstName)
        .replace(/\{fullName\}/g, recipient.fullName)
        .replace(/\{email\}/g, recipient.email);
}

function buildGreeting(greetingStyle, recipient) {
    if (greetingStyle === 'HELLO') {
        return `Hello ${recipient.firstName},`;
    }

    if (greetingStyle === 'WARM') {
        return `Warm greetings ${recipient.firstName},`;
    }

    return `Dear ${recipient.fullName},`;
}

function splitParagraphs(value) {
    return normalizeMultiline(value)
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}

function getMessageTypeLabel(messageType) {
    const labels = {
        PROFESSIONAL_UPDATE: 'Professional Update',
        CAMPAIGN: 'Campaign',
        OFFER: 'Offer',
    };

    return labels[messageType] || 'Campaign';
}

function getAudienceLabel(audienceType) {
    const labels = {
        USERS: 'Users only',
        SUBSCRIBERS: 'Subscribers only',
        BOTH: 'Users and subscribers',
    };

    return labels[audienceType] || 'Selected audience';
}

function getRecipientSourceLabel(source) {
    const labels = {
        user: 'Registered user',
        subscriber: 'Subscriber',
        both: 'Both audiences',
        admin_test: 'Admin test',
    };

    return labels[source] || 'Audience contact';
}

function getDeliveryTypeLabel(deliveryType) {
    const labels = {
        LIVE: 'Campaign send',
        TEST: 'Test send',
    };

    return labels[deliveryType] || 'Delivery';
}

function renderCampaignPreview(campaignPayload, previewRecipient = {}) {
    const recipient = normalizePreviewRecipient(previewRecipient);
    const greeting = buildGreeting(campaignPayload.greetingStyle, recipient);
    const subject = replaceTokens(campaignPayload.subject, recipient);
    const title = replaceTokens(campaignPayload.title, recipient);
    const preheader = replaceTokens(campaignPayload.preheader, recipient);
    const body = replaceTokens(campaignPayload.body, recipient);
    const highlightTitle = replaceTokens(campaignPayload.highlightTitle, recipient);
    const highlightBody = replaceTokens(campaignPayload.highlightBody, recipient);
    const ctaLabel = replaceTokens(campaignPayload.ctaLabel, recipient);
    const signature = replaceTokens(campaignPayload.signature, recipient);
    const bodyParagraphs = splitParagraphs(body);
    const highlightParagraphs = splitParagraphs(highlightBody);
    const safeGreeting = escapeHtml(greeting);
    const safeTitle = escapeHtml(title);
    const safePreheader = escapeHtml(preheader);
    const safeSignature = formatPlainTextForHtml(signature);
    const bodyHtml = bodyParagraphs.map((paragraph) => `<p style="margin: 0 0 16px; line-height: 1.7; color: #425063;">${formatPlainTextForHtml(paragraph)}</p>`).join('');
    const highlightHtml = highlightParagraphs.map((paragraph) => `<p style="margin: 0 0 12px; line-height: 1.7; color: #425063;">${formatPlainTextForHtml(paragraph)}</p>`).join('');
    const accentColor = campaignPayload.messageType === 'OFFER' ? '#8a7443' : campaignPayload.messageType === 'CAMPAIGN' ? '#0B1C3E' : '#35624d';
    const html = `
        <div style="background: #f5f1e7; margin: 0; padding: 32px 16px; font-family: Arial, sans-serif;">
            <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e9dfcd; border-radius: 28px; overflow: hidden; box-shadow: 0 18px 46px rgba(16, 28, 45, 0.08);">
                <div style="padding: 28px 32px; background: linear-gradient(135deg, #fcfbf8 0%, #f5f1e7 100%); border-bottom: 1px solid #efe8d8;">
                    <div style="font-size: 11px; letter-spacing: 0.24em; font-weight: 700; text-transform: uppercase; color: ${accentColor};">${escapeHtml(getMessageTypeLabel(campaignPayload.messageType))}</div>
                    <h1 style="margin: 14px 0 0; font-size: 30px; line-height: 1.15; color: #101c2d;">${safeTitle}</h1>
                    ${safePreheader ? `<p style="margin: 14px 0 0; font-size: 15px; line-height: 1.7; color: #5b6472;">${safePreheader}</p>` : ''}
                </div>
                <div style="padding: 32px;">
                    <p style="margin: 0 0 20px; font-size: 16px; font-weight: 700; color: #101c2d;">${safeGreeting}</p>
                    ${bodyHtml || '<p style="margin: 0; color: #425063;">Add your message body to preview the campaign.</p>'}
                    ${highlightTitle || highlightHtml ? `
                        <div style="margin-top: 28px; padding: 22px; border-radius: 22px; background: #fbfaf7; border: 1px solid #ece4d2;">
                            ${highlightTitle ? `<div style="margin-bottom: 10px; font-size: 18px; font-weight: 700; color: #101c2d;">${escapeHtml(highlightTitle)}</div>` : ''}
                            ${highlightHtml || ''}
                        </div>
                    ` : ''}
                    ${ctaLabel && campaignPayload.ctaUrl ? `
                        <div style="margin-top: 28px;">
                            <a href="${escapeHtml(campaignPayload.ctaUrl)}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #101c2d; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none;">${escapeHtml(ctaLabel)}</a>
                        </div>
                    ` : ''}
                    <div style="margin-top: 32px; padding-top: 22px; border-top: 1px solid #efe8d8; color: #425063; line-height: 1.7;">
                        ${safeSignature}
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        audienceLabel: getAudienceLabel(campaignPayload.audienceType),
        messageTypeLabel: getMessageTypeLabel(campaignPayload.messageType),
        recipient,
        subject,
        title,
        preheader,
        greeting,
        body,
        bodyParagraphs,
        highlightTitle,
        highlightBody,
        highlightParagraphs,
        ctaLabel,
        ctaUrl: campaignPayload.ctaUrl,
        signature,
        html,
        text: [
            subject,
            '',
            greeting,
            '',
            ...bodyParagraphs,
            ...(highlightTitle ? ['', highlightTitle] : []),
            ...highlightParagraphs,
            ...(ctaLabel && campaignPayload.ctaUrl ? ['', `${ctaLabel}: ${campaignPayload.ctaUrl}`] : []),
            '',
            signature,
        ].join('\n'),
    };
}

function serializeEmailCampaign(campaign) {
    if (!campaign) {
        return null;
    }

    return {
        id: campaign.id,
        internalName: campaign.internalName,
        subject: campaign.subject,
        audienceType: campaign.audienceType,
        messageType: campaign.messageType,
        greetingStyle: campaign.greetingStyle,
        title: campaign.title,
        preheader: campaign.preheader || '',
        body: campaign.body,
        highlightTitle: campaign.highlightTitle || '',
        highlightBody: campaign.highlightBody || '',
        ctaLabel: campaign.ctaLabel || '',
        ctaUrl: campaign.ctaUrl || '',
        signature: campaign.signature,
        status: campaign.status,
        recipientCount: campaign.recipientCount || 0,
        sentCount: campaign.sentCount || 0,
        failedCount: campaign.failedCount || 0,
        lastSentAt: campaign.lastSentAt || null,
        lastTestSentAt: campaign.lastTestSentAt || null,
        lastError: campaign.lastError || '',
        audienceLabel: getAudienceLabel(campaign.audienceType),
        messageTypeLabel: getMessageTypeLabel(campaign.messageType),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        deliveryLogs: Array.isArray(campaign.recipients)
            ? campaign.recipients.map((recipient) => ({
                id: recipient.id,
                email: recipient.email,
                name: recipient.name || '',
                source: recipient.source,
                sourceLabel: getRecipientSourceLabel(recipient.source),
                deliveryType: recipient.deliveryType,
                deliveryTypeLabel: getDeliveryTypeLabel(recipient.deliveryType),
                status: recipient.status,
                errorMessage: recipient.errorMessage || '',
                sentAt: recipient.sentAt || null,
                createdAt: recipient.createdAt,
            }))
            : [],
        createdBy: campaign.createdBy ? {
            id: campaign.createdBy.id,
            name: campaign.createdBy.name,
            email: campaign.createdBy.email,
        } : null,
        updatedBy: campaign.updatedBy ? {
            id: campaign.updatedBy.id,
            name: campaign.updatedBy.name,
            email: campaign.updatedBy.email,
        } : null,
    };
}

module.exports = {
    AUDIENCE_TYPES,
    CAMPAIGN_STATUS,
    GREETING_STYLES,
    MESSAGE_TYPES,
    getAudienceLabel,
    getMessageTypeLabel,
    normalizeCampaignPayload,
    normalizePreviewRecipient,
    renderCampaignPreview,
    serializeEmailCampaign,
};
