const path = require('path');
const prisma = require('../db');

const STORED_FILE_CATEGORIES = Object.freeze({
    BOOKING_DOCUMENT: 'booking_document',
    CHAT_IMAGE: 'chat_image',
    MEDIA_POST_IMAGE: 'media_post_image',
    PACKAGE_IMAGE: 'package_image',
    PROFILE_IMAGE: 'profile_image',
    REVIEW_IMAGE: 'review_image',
    REVIEW_VIDEO: 'review_video',
});

const STORED_FILE_ROUTE_PREFIXES = Object.freeze({
    BOOKING_DOCUMENT: '/api/bookings/documents/',
    CHAT_IMAGE: '/api/chat/files/',
    PUBLIC: '/api/media/public/',
});

const PUBLIC_STORED_FILE_CATEGORIES = new Set([
    STORED_FILE_CATEGORIES.MEDIA_POST_IMAGE,
    STORED_FILE_CATEGORIES.PACKAGE_IMAGE,
    STORED_FILE_CATEGORIES.PROFILE_IMAGE,
    STORED_FILE_CATEGORIES.REVIEW_IMAGE,
    STORED_FILE_CATEGORIES.REVIEW_VIDEO,
]);

function sanitizeOriginalName(value) {
    const filename = path.basename(String(value || 'upload'));
    const sanitized = filename.replace(/[\u0000-\u001f\u007f"\\/]+/g, '_').trim();

    return sanitized || 'upload';
}

function parseStrictPositiveInteger(value) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
        return value;
    }

    const normalized = String(value || '').trim();
    if (!/^[1-9]\d*$/.test(normalized)) {
        return null;
    }

    const parsed = Number.parseInt(normalized, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
}

function isPublicStoredFileCategory(category) {
    return PUBLIC_STORED_FILE_CATEGORIES.has(category);
}

function getStoredFileRoutePrefix(category) {
    switch (category) {
        case STORED_FILE_CATEGORIES.BOOKING_DOCUMENT:
            return STORED_FILE_ROUTE_PREFIXES.BOOKING_DOCUMENT;
        case STORED_FILE_CATEGORIES.CHAT_IMAGE:
            return STORED_FILE_ROUTE_PREFIXES.CHAT_IMAGE;
        default:
            return STORED_FILE_ROUTE_PREFIXES.PUBLIC;
    }
}

function buildStoredFileUrl(fileId, category) {
    const normalizedId = parseStrictPositiveInteger(fileId);
    if (normalizedId === null) {
        throw new Error('A valid stored file id is required.');
    }

    return `${getStoredFileRoutePrefix(category)}${normalizedId}`;
}

function buildPublicStoredFileUrl(fileId) {
    return buildStoredFileUrl(fileId, STORED_FILE_CATEGORIES.PACKAGE_IMAGE);
}

function buildProtectedBookingStoredFileUrl(fileId) {
    return buildStoredFileUrl(fileId, STORED_FILE_CATEGORIES.BOOKING_DOCUMENT);
}

function buildProtectedChatStoredFileUrl(fileId) {
    return buildStoredFileUrl(fileId, STORED_FILE_CATEGORIES.CHAT_IMAGE);
}

function extractStoredFileIdFromReference(value, allowedPrefixes = []) {
    const directId = parseStrictPositiveInteger(value);
    if (directId !== null) {
        return directId;
    }

    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return null;
    }

    for (const prefix of allowedPrefixes) {
        const prefixIndex = trimmed.indexOf(prefix);
        if (prefixIndex === -1) {
            continue;
        }

        const candidate = trimmed
            .slice(prefixIndex + prefix.length)
            .split(/[/?#]/, 1)[0];
        const parsed = parseStrictPositiveInteger(candidate);

        if (parsed !== null) {
            return parsed;
        }
    }

    return null;
}

async function createStoredFile({ file, category, uploadedByUserId = null }) {
    if (!file || !file.buffer) {
        throw new Error('An uploaded file buffer is required.');
    }

    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);

    return prisma.storedFile.create({
        data: {
            originalName: sanitizeOriginalName(file.originalname),
            mimeType: String(file.mimetype || 'application/octet-stream'),
            size: Number.isInteger(file.size) ? file.size : buffer.length,
            data: buffer,
            category,
            isPublic: isPublicStoredFileCategory(category),
            uploadedByUserId: parseStrictPositiveInteger(uploadedByUserId),
        },
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            category: true,
            isPublic: true,
            uploadedByUserId: true,
            createdAt: true,
        },
    });
}

async function findStoredFileById(fileId, { includeData = true } = {}) {
    const normalizedId = parseStrictPositiveInteger(fileId);
    if (normalizedId === null) {
        return null;
    }

    return prisma.storedFile.findUnique({
        where: { id: normalizedId },
        select: includeData
            ? {
                id: true,
                originalName: true,
                mimeType: true,
                size: true,
                data: true,
                category: true,
                isPublic: true,
                uploadedByUserId: true,
                createdAt: true,
            }
            : {
                id: true,
                originalName: true,
                mimeType: true,
                size: true,
                category: true,
                isPublic: true,
                uploadedByUserId: true,
                createdAt: true,
            },
    });
}

function getStoredFileIdsFromReferences(references, allowedPrefixes = []) {
    if (!Array.isArray(references)) {
        return [];
    }

    return Array.from(new Set(
        references
            .map((reference) => extractStoredFileIdFromReference(reference, allowedPrefixes))
            .filter((value) => value !== null)
    ));
}

async function deleteStoredFilesByIds(fileIds) {
    const normalizedIds = Array.from(new Set(
        (Array.isArray(fileIds) ? fileIds : [])
            .map((value) => parseStrictPositiveInteger(value))
            .filter((value) => value !== null)
    ));

    if (normalizedIds.length === 0) {
        return { count: 0 };
    }

    return prisma.storedFile.deleteMany({
        where: {
            id: { in: normalizedIds },
        },
    });
}

async function deleteStoredFilesByReferences(references, allowedPrefixes = []) {
    return deleteStoredFilesByIds(getStoredFileIdsFromReferences(references, allowedPrefixes));
}

function sendStoredFile(res, storedFile) {
    if (!storedFile || !storedFile.data) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const filename = sanitizeOriginalName(storedFile.originalName || `file-${storedFile.id}`);

    res.setHeader('Content-Type', storedFile.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(storedFile.size || storedFile.data.length));
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '_')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', storedFile.isPublic
        ? 'public, max-age=31536000, immutable'
        : 'private, no-store');

    return res.send(storedFile.data);
}

module.exports = {
    STORED_FILE_CATEGORIES,
    STORED_FILE_ROUTE_PREFIXES,
    buildProtectedBookingStoredFileUrl,
    buildProtectedChatStoredFileUrl,
    buildPublicStoredFileUrl,
    buildStoredFileUrl,
    createStoredFile,
    deleteStoredFilesByIds,
    deleteStoredFilesByReferences,
    extractStoredFileIdFromReference,
    findStoredFileById,
    getStoredFileIdsFromReferences,
    isPublicStoredFileCategory,
    parseStrictPositiveInteger,
    sendStoredFile,
};
