const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrManager } = require('../middleware/adminAuth');
const {
    packageImageUpload,
    runUpload,
    sendUploadError,
} = require('../utils/upload');
const {
    STORED_FILE_CATEGORIES,
    STORED_FILE_ROUTE_PREFIXES,
    buildPublicStoredFileUrl,
    createStoredFile,
    deleteStoredFilesByIds,
    deleteStoredFilesByReferences,
} = require('../utils/storedFiles');
const {
    isNonEmptyString,
    normalizeBoolean,
    parseOptionalDate,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

const MEDIA_POST_IMAGE_LIMIT = 8;

function parseExistingImagesField(value) {
    if (value === undefined) {
        return null;
    }

    if (Array.isArray(value)) {
        return value.map((item) => toTrimmedString(item)).filter(Boolean);
    }

    const normalizedValue = toTrimmedString(value);
    if (!normalizedValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(normalizedValue);
        if (!Array.isArray(parsed)) {
            return null;
        }

        return parsed.map((item) => toTrimmedString(item)).filter(Boolean);
    } catch (error) {
        return null;
    }
}

function isValidExternalVideoUrl(value) {
    const normalizedValue = toTrimmedString(value);
    if (!normalizedValue) {
        return true;
    }

    try {
        const url = new URL(normalizedValue);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function serializeMediaPost(post) {
    if (!post || typeof post !== 'object') {
        return post;
    }

    return {
        ...post,
        heroImage: Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : null,
        mediaCount: (Array.isArray(post.images) ? post.images.length : 0) + (post.videoUrl ? 1 : 0),
    };
}

async function createMediaPostImageUrls(files, uploadedByUserId, createdStoredFileIds) {
    if (!Array.isArray(files) || files.length === 0) {
        return [];
    }

    return Promise.all(files.map(async (file) => {
        const storedFile = await createStoredFile({
            file,
            category: STORED_FILE_CATEGORIES.MEDIA_POST_IMAGE,
            uploadedByUserId,
        });
        createdStoredFileIds.push(storedFile.id);
        return buildPublicStoredFileUrl(storedFile.id);
    }));
}

async function resolveRelatedPackageId(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const relatedPackageId = toPositiveInteger(value);
    if (relatedPackageId === null) {
        return { error: 'Related package must be a positive integer.' };
    }

    const existingPackage = await prisma.package.findUnique({
        where: { id: relatedPackageId },
        select: { id: true },
    });

    if (!existingPackage) {
        return { error: 'Selected package was not found.' };
    }

    return { value: relatedPackageId };
}

router.get('/', async (req, res) => {
    try {
        const limit = req.query.limit === undefined ? null : toPositiveInteger(req.query.limit);
        if (req.query.limit !== undefined && limit === null) {
            return sendValidationError(res, 'Limit must be a positive integer.');
        }

        const mediaPosts = await prisma.mediaPost.findMany({
            where: { isPublished: true },
            orderBy: [
                { displayOrder: 'asc' },
                { eventDate: 'desc' },
                { id: 'asc' },
            ],
            include: {
                relatedPackage: {
                    select: {
                        id: true,
                        title: true,
                        destination: true,
                    },
                },
            },
            ...(limit ? { take: limit } : {}),
        });

        return res.json(mediaPosts.map(serializeMediaPost));
    } catch (err) {
        console.error('Error fetching public media posts:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/manage', auth, requireAdminOrManager, async (req, res) => {
    try {
        const mediaPosts = await prisma.mediaPost.findMany({
            orderBy: [
                { displayOrder: 'asc' },
                { createdAt: 'desc' },
                { id: 'asc' },
            ],
            include: {
                relatedPackage: {
                    select: {
                        id: true,
                        title: true,
                        destination: true,
                    },
                },
            },
        });

        return res.json(mediaPosts.map(serializeMediaPost));
    } catch (err) {
        console.error('Error fetching media posts for management:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        await runUpload(packageImageUpload.array('images', MEDIA_POST_IMAGE_LIMIT), req, res);
    } catch (error) {
        return sendUploadError(res, error, 'Media post images must be 5 MB or smaller.');
    }

    const createdStoredFileIds = [];

    try {
        const {
            title,
            caption,
            destination,
            eventDate,
            videoUrl,
            isPublished,
            relatedPackageId,
        } = req.body;

        if (!isNonEmptyString(title)) {
            return sendValidationError(res, 'Title is required.');
        }

        if (!isNonEmptyString(caption)) {
            return sendValidationError(res, 'Caption is required.');
        }

        const parsedEventDate = parseOptionalDate(eventDate);
        if (eventDate && parsedEventDate === null) {
            return sendValidationError(res, 'Event date must be a valid date.');
        }

        if (!isValidExternalVideoUrl(videoUrl)) {
            return sendValidationError(res, 'Video link must be a valid http or https URL.');
        }

        const normalizedIsPublished = normalizeBoolean(isPublished);
        const relatedPackageResult = await resolveRelatedPackageId(relatedPackageId);
        if (relatedPackageResult?.error) {
            return sendValidationError(res, relatedPackageResult.error);
        }

        const uploadedByUserId = toPositiveInteger(req.user.id);
        const imageUrls = await createMediaPostImageUrls(req.files, uploadedByUserId, createdStoredFileIds);
        const normalizedVideoUrl = toTrimmedString(videoUrl) || null;

        if (imageUrls.length === 0 && !normalizedVideoUrl) {
            return sendValidationError(res, 'Add at least one image or a video link before saving a media post.');
        }

        const maxOrder = await prisma.mediaPost.aggregate({
            _max: {
                displayOrder: true,
            },
        });

        const mediaPost = await prisma.mediaPost.create({
            data: {
                title: toTrimmedString(title),
                caption: toTrimmedString(caption),
                destination: isNonEmptyString(destination) ? toTrimmedString(destination) : null,
                eventDate: parsedEventDate,
                videoUrl: normalizedVideoUrl,
                images: imageUrls,
                isPublished: normalizedIsPublished === true,
                displayOrder: Number(maxOrder._max.displayOrder || 0) + 1,
                relatedPackageId: relatedPackageResult?.value || null,
            },
            include: {
                relatedPackage: {
                    select: {
                        id: true,
                        title: true,
                        destination: true,
                    },
                },
            },
        });

        return res.status(201).json(serializeMediaPost(mediaPost));
    } catch (err) {
        if (createdStoredFileIds.length > 0) {
            await deleteStoredFilesByIds(createdStoredFileIds);
        }

        console.error('Error creating media post:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/reorder', auth, requireAdmin, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return sendValidationError(res, 'orderedIds must be a non-empty array of ids.');
        }

        const normalizedIds = orderedIds.map((id) => toPositiveInteger(id));
        if (normalizedIds.some((id) => id === null)) {
            return sendValidationError(res, 'orderedIds must contain only positive integer ids.');
        }

        await prisma.$transaction(normalizedIds.map((id, index) => (
            prisma.mediaPost.update({
                where: { id },
                data: { displayOrder: index + 1 },
            })
        )));

        return res.json({ msg: 'Media posts reordered successfully.' });
    } catch (err) {
        console.error('Error reordering media posts:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        await runUpload(packageImageUpload.array('images', MEDIA_POST_IMAGE_LIMIT), req, res);
    } catch (error) {
        return sendUploadError(res, error, 'Media post images must be 5 MB or smaller.');
    }

    const mediaPostId = toPositiveInteger(req.params.id);
    if (mediaPostId === null) {
        return sendInvalidId(res);
    }

    const createdStoredFileIds = [];

    try {
        const existingMediaPost = await prisma.mediaPost.findUnique({
            where: { id: mediaPostId },
            select: {
                id: true,
                images: true,
                displayOrder: true,
            },
        });

        if (!existingMediaPost) {
            return res.status(404).json({ msg: 'Media post not found.' });
        }

        const {
            title,
            caption,
            destination,
            eventDate,
            videoUrl,
            isPublished,
            relatedPackageId,
            existingImages,
        } = req.body;

        if (!isNonEmptyString(title)) {
            return sendValidationError(res, 'Title is required.');
        }

        if (!isNonEmptyString(caption)) {
            return sendValidationError(res, 'Caption is required.');
        }

        const parsedEventDate = parseOptionalDate(eventDate);
        if (eventDate && parsedEventDate === null) {
            return sendValidationError(res, 'Event date must be a valid date.');
        }

        if (!isValidExternalVideoUrl(videoUrl)) {
            return sendValidationError(res, 'Video link must be a valid http or https URL.');
        }

        const desiredExistingImages = parseExistingImagesField(existingImages);
        if (existingImages !== undefined && desiredExistingImages === null) {
            return sendValidationError(res, 'existingImages must be a valid JSON array.');
        }

        const keptExistingImages = desiredExistingImages === null
            ? [...(existingMediaPost.images || [])]
            : (existingMediaPost.images || []).filter((image) => desiredExistingImages.includes(image));

        const relatedPackageResult = await resolveRelatedPackageId(relatedPackageId);
        if (relatedPackageResult?.error) {
            return sendValidationError(res, relatedPackageResult.error);
        }

        const uploadedByUserId = toPositiveInteger(req.user.id);
        const uploadedImageUrls = await createMediaPostImageUrls(req.files, uploadedByUserId, createdStoredFileIds);
        const nextImages = [...keptExistingImages, ...uploadedImageUrls];
        const normalizedVideoUrl = toTrimmedString(videoUrl) || null;

        if (nextImages.length === 0 && !normalizedVideoUrl) {
            return sendValidationError(res, 'Add at least one image or a video link before saving a media post.');
        }

        const normalizedIsPublished = normalizeBoolean(isPublished);
        const updatedMediaPost = await prisma.mediaPost.update({
            where: { id: mediaPostId },
            data: {
                title: toTrimmedString(title),
                caption: toTrimmedString(caption),
                destination: isNonEmptyString(destination) ? toTrimmedString(destination) : null,
                eventDate: parsedEventDate,
                videoUrl: normalizedVideoUrl,
                images: nextImages,
                isPublished: normalizedIsPublished === null ? undefined : normalizedIsPublished,
                relatedPackageId: relatedPackageResult?.value || null,
            },
            include: {
                relatedPackage: {
                    select: {
                        id: true,
                        title: true,
                        destination: true,
                    },
                },
            },
        });

        const removedImages = (existingMediaPost.images || []).filter((image) => !keptExistingImages.includes(image));
        if (removedImages.length > 0) {
            await deleteStoredFilesByReferences(removedImages, [STORED_FILE_ROUTE_PREFIXES.PUBLIC]);
        }

        return res.json(serializeMediaPost(updatedMediaPost));
    } catch (err) {
        if (createdStoredFileIds.length > 0) {
            await deleteStoredFilesByIds(createdStoredFileIds);
        }

        console.error('Error updating media post:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const mediaPostId = toPositiveInteger(req.params.id);
        if (mediaPostId === null) {
            return sendInvalidId(res);
        }

        const existingMediaPost = await prisma.mediaPost.findUnique({
            where: { id: mediaPostId },
            select: {
                id: true,
                images: true,
            },
        });

        if (!existingMediaPost) {
            return res.status(404).json({ msg: 'Media post not found.' });
        }

        await prisma.mediaPost.delete({
            where: { id: mediaPostId },
        });

        if (existingMediaPost.images?.length) {
            await deleteStoredFilesByReferences(existingMediaPost.images, [STORED_FILE_ROUTE_PREFIXES.PUBLIC]);
        }

        return res.json({ msg: 'Media post deleted successfully.' });
    } catch (err) {
        console.error('Error deleting media post:', err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
