const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const env = require('../config/env');

const serverRoot = path.join(__dirname, '..');
const configuredUploadRoot = String(env.UPLOAD_ROOT || '').trim();
const publicUploadRoot = configuredUploadRoot
    ? path.resolve(configuredUploadRoot, 'public')
    : path.join(serverRoot, 'public', 'uploads');
const privateUploadRoot = configuredUploadRoot
    ? path.resolve(configuredUploadRoot, 'private')
    : path.join(serverRoot, 'private', 'uploads');
const privateBookingDocumentDir = path.join(privateUploadRoot, 'bookings');
const privateChatUploadDir = path.join(privateUploadRoot, 'chat');

const mimeToExtension = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
};

const mimeToAllowedExtensions = {
    'application/pdf': new Set(['.pdf']),
    'image/jpeg': new Set(['.jpg', '.jpeg']),
    'image/png': new Set(['.png']),
    'image/webp': new Set(['.webp']),
    'video/mp4': new Set(['.mp4']),
    'video/webm': new Set(['.webm']),
};

const publicImageMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const reviewMediaMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
]);

const privateDocumentMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const chatMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

function ensureDirectoryExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

function sanitizeSegment(value, fallback = 'file') {
    const normalized = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || fallback;
}

function buildSafeFilename(file) {
    const extension = mimeToExtension[file.mimetype];

    if (!extension) {
        throw new Error('Invalid file type.');
    }

    const fieldName = sanitizeSegment(file.fieldname || 'file');
    const randomSuffix = crypto.randomBytes(6).toString('hex');

    return `${fieldName}-${Date.now()}-${randomSuffix}.${extension}`;
}

function isAllowedFileType(file, allowedMimeTypes) {
    if (!file || !file.mimetype || !allowedMimeTypes?.has(file.mimetype)) {
        return false;
    }

    const originalExtension = path.extname(String(file.originalname || '')).toLowerCase();
    const allowedExtensions = mimeToAllowedExtensions[file.mimetype];

    if (!allowedExtensions || allowedExtensions.size === 0) {
        return false;
    }

    return allowedExtensions.has(originalExtension);
}

function createDiskStorage(rootDirectory, subdirectory) {
    const targetDirectory = path.join(rootDirectory, subdirectory);
    ensureDirectoryExists(targetDirectory);

    return multer.diskStorage({
        destination(req, file, cb) {
            ensureDirectoryExists(targetDirectory);
            cb(null, targetDirectory);
        },
        filename(req, file, cb) {
            try {
                cb(null, buildSafeFilename(file));
            } catch (error) {
                cb(error);
            }
        },
    });
}

function createUploadHandler({
    rootDirectory,
    subdirectory,
    allowedMimeTypes,
    invalidTypeMessage,
    maxFileSize,
}) {
    return multer({
        storage: createDiskStorage(rootDirectory, subdirectory),
        limits: {
            fileSize: maxFileSize,
        },
        fileFilter(req, file, cb) {
            if (!isAllowedFileType(file, allowedMimeTypes)) {
                return cb(new Error(invalidTypeMessage));
            }

            return cb(null, true);
        },
    });
}

function runUpload(middleware, req, res) {
    return new Promise((resolve, reject) => {
        middleware(req, res, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

function sendUploadError(res, error, tooLargeMessage = 'File too large.') {
    let message = 'Upload failed.';

    if (error instanceof multer.MulterError) {
        message = error.code === 'LIMIT_FILE_SIZE' ? tooLargeMessage : error.message;
    } else if (error && error.message) {
        message = error.message;
    }

    return res.status(400).json({
        success: false,
        message,
        msg: message,
    });
}

function collectUploadedFiles(filesInput) {
    if (!filesInput) {
        return [];
    }

    if (Array.isArray(filesInput)) {
        return filesInput;
    }

    if (typeof filesInput === 'object') {
        if (filesInput.path || filesInput.filename) {
            return [filesInput];
        }

        return Object.values(filesInput).flat();
    }

    return [];
}

function removeUploadedFiles(filesInput) {
    const files = collectUploadedFiles(filesInput);

    for (const file of files) {
        if (!file || !file.path) {
            continue;
        }

        try {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        } catch (error) {
            // Best-effort cleanup only.
        }
    }
}

function validateReviewMediaSizes(filesInput) {
    const files = collectUploadedFiles(filesInput);

    for (const file of files) {
        if (!file || !file.mimetype) {
            continue;
        }

        if (file.mimetype.startsWith('image/') && file.size > 5 * 1024 * 1024) {
            return 'Review images must be 5 MB or smaller.';
        }
    }

    return null;
}

function toPublicUploadUrl(subdirectory, filename) {
    return `/uploads/${subdirectory}/${filename}`;
}

function toProtectedBookingDocumentUrl(filename) {
    return `/api/bookings/documents/${filename}`;
}

function toProtectedChatUploadUrl(filename) {
    return `/api/chat/files/${filename}`;
}

function isSafeStoredFilename(filename) {
    return /^[a-z0-9-]+\.[a-z0-9]+$/i.test(String(filename || ''));
}

function extractSafeFilenameFromReference(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (isSafeStoredFilename(trimmed)) {
        return trimmed;
    }

    const knownPrefixes = [
        '/api/bookings/documents/',
        '/uploads/bookings/',
    ];

    const prefix = knownPrefixes.find((candidate) => trimmed.startsWith(candidate));
    if (!prefix) {
        return null;
    }

    const filename = path.posix.basename(trimmed);

    return isSafeStoredFilename(filename) ? filename : null;
}

function resolvePrivateBookingDocumentPath(filename) {
    if (!isSafeStoredFilename(filename)) {
        return null;
    }

    const baseDirectory = path.resolve(privateBookingDocumentDir);
    const resolvedPath = path.resolve(baseDirectory, filename);
    const normalizedBase = `${baseDirectory.toLowerCase()}${path.sep}`;
    const normalizedResolved = resolvedPath.toLowerCase();

    if (normalizedResolved !== baseDirectory.toLowerCase() && !normalizedResolved.startsWith(normalizedBase)) {
        return null;
    }

    return resolvedPath;
}

function resolvePrivateChatUploadPath(filename) {
    if (!isSafeStoredFilename(filename)) {
        return null;
    }

    const baseDirectory = path.resolve(privateChatUploadDir);
    const resolvedPath = path.resolve(baseDirectory, filename);
    const normalizedBase = `${baseDirectory.toLowerCase()}${path.sep}`;
    const normalizedResolved = resolvedPath.toLowerCase();

    if (normalizedResolved !== baseDirectory.toLowerCase() && !normalizedResolved.startsWith(normalizedBase)) {
        return null;
    }

    return resolvedPath;
}

const chatUpload = createUploadHandler({
    rootDirectory: privateUploadRoot,
    subdirectory: 'chat',
    allowedMimeTypes: chatMimeTypes,
    invalidTypeMessage: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    maxFileSize: 10 * 1024 * 1024,
});

const packageImageUpload = createUploadHandler({
    rootDirectory: publicUploadRoot,
    subdirectory: 'packages',
    allowedMimeTypes: publicImageMimeTypes,
    invalidTypeMessage: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    maxFileSize: 5 * 1024 * 1024,
});

const profileImageUpload = createUploadHandler({
    rootDirectory: publicUploadRoot,
    subdirectory: 'profiles',
    allowedMimeTypes: publicImageMimeTypes,
    invalidTypeMessage: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    maxFileSize: 5 * 1024 * 1024,
});

const reviewMediaUpload = createUploadHandler({
    rootDirectory: publicUploadRoot,
    subdirectory: 'reviews',
    allowedMimeTypes: reviewMediaMimeTypes,
    invalidTypeMessage: 'Invalid file type. Only JPEG, PNG, WebP, MP4, and WebM files are allowed.',
    maxFileSize: 25 * 1024 * 1024,
});

const bookingDocumentUpload = createUploadHandler({
    rootDirectory: privateUploadRoot,
    subdirectory: 'bookings',
    allowedMimeTypes: privateDocumentMimeTypes,
    invalidTypeMessage: 'Invalid file type. Only PDF, JPEG, PNG, and WebP files are allowed.',
    maxFileSize: 10 * 1024 * 1024,
});

ensureDirectoryExists(publicUploadRoot);
ensureDirectoryExists(privateBookingDocumentDir);
ensureDirectoryExists(privateChatUploadDir);

module.exports = {
    bookingDocumentUpload,
    chatUpload,
    extractSafeFilenameFromReference,
    packageImageUpload,
    privateBookingDocumentDir,
    privateChatUploadDir,
    privateUploadRoot,
    profileImageUpload,
    publicUploadRoot,
    removeUploadedFiles,
    resolvePrivateBookingDocumentPath,
    resolvePrivateChatUploadPath,
    reviewMediaUpload,
    runUpload,
    sendUploadError,
    isAllowedFileType,
    toProtectedChatUploadUrl,
    toProtectedBookingDocumentUrl,
    toPublicUploadUrl,
    validateReviewMediaSizes,
};
