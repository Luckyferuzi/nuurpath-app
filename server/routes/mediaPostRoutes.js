const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const softAuth = require('../middleware/softAuth');
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
const MEDIA_POST_PUBLIC_COMMENT_LIMIT = 20;
const MEDIA_POST_RECENT_ACTIVITY_LIMIT = 4;
const MEDIA_POST_INTERACTION_TYPES = Object.freeze({
    LIKE: 'LIKE',
    VIDEO_VIEW: 'VIDEO_VIEW',
});
const RELATED_PACKAGE_SELECT = {
    id: true,
    title: true,
    destination: true,
};
const COMMENT_WITH_USER_INCLUDE = {
    user: {
        select: {
            id: true,
            name: true,
        },
    },
};
const INTERACTION_WITH_USER_INCLUDE = {
    user: {
        select: {
            id: true,
            name: true,
        },
    },
};

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

function normalizeMediaPostInteractionType(value) {
    const normalizedValue = toTrimmedString(value).toUpperCase();

    if (!normalizedValue) {
        return null;
    }

    return Object.values(MEDIA_POST_INTERACTION_TYPES).includes(normalizedValue)
        ? normalizedValue
        : null;
}

function createEmptyEngagementSummary() {
    return {
        likes: 0,
        comments: 0,
        videoViews: 0,
    };
}

function readEngagementSummary(engagementSummaryMap, mediaPostId) {
    if (!engagementSummaryMap || !engagementSummaryMap.has(mediaPostId)) {
        return createEmptyEngagementSummary();
    }

    return engagementSummaryMap.get(mediaPostId);
}

function serializeMediaPostComment(comment) {
    if (!comment || typeof comment !== 'object') {
        return comment;
    }

    return {
        id: comment.id,
        mediaPostId: comment.mediaPostId,
        userId: comment.userId || null,
        authorName: comment.authorName,
        authorLocation: comment.authorLocation,
        message: comment.message,
        createdAt: comment.createdAt,
        authorDisplayName: comment.user?.name || comment.authorName,
    };
}

function serializeMediaPostInteraction(interaction) {
    if (!interaction || typeof interaction !== 'object') {
        return interaction;
    }

    return {
        id: interaction.id,
        mediaPostId: interaction.mediaPostId,
        userId: interaction.userId || null,
        type: interaction.type,
        createdAt: interaction.createdAt,
        actorName: interaction.user?.name || 'Website visitor',
    };
}

function serializeMediaPost(post, options = {}) {
    if (!post || typeof post !== 'object') {
        return post;
    }

    const {
        comments: rawComments,
        interactions: rawInteractions,
        ...rest
    } = post;
    const response = {
        ...rest,
        heroImage: Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : null,
        mediaCount: (Array.isArray(post.images) ? post.images.length : 0) + (post.videoUrl ? 1 : 0),
        engagement: options.engagementSummary || createEmptyEngagementSummary(),
    };

    if (options.comments !== undefined) {
        response.comments = options.comments.map(serializeMediaPostComment);
    }

    if (options.recentComments !== undefined) {
        response.recentComments = options.recentComments.map(serializeMediaPostComment);
    }

    if (options.recentInteractions !== undefined) {
        response.recentInteractions = options.recentInteractions.map(serializeMediaPostInteraction);
    }

    if (options.relatedStories !== undefined) {
        response.relatedStories = options.relatedStories;
    }

    return response;
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

async function buildEngagementSummaryMap(mediaPostIds) {
    const normalizedMediaPostIds = Array.from(new Set(
        (Array.isArray(mediaPostIds) ? mediaPostIds : [])
            .map((value) => toPositiveInteger(value))
            .filter((value) => value !== null)
    ));

    const summaryMap = new Map();
    normalizedMediaPostIds.forEach((mediaPostId) => {
        summaryMap.set(mediaPostId, createEmptyEngagementSummary());
    });

    if (normalizedMediaPostIds.length === 0) {
        return summaryMap;
    }

    const [commentCounts, interactionCounts] = await Promise.all([
        prisma.mediaPostComment.groupBy({
            by: ['mediaPostId'],
            where: {
                mediaPostId: {
                    in: normalizedMediaPostIds,
                },
            },
            _count: {
                _all: true,
            },
        }),
        prisma.mediaPostInteraction.groupBy({
            by: ['mediaPostId', 'type'],
            where: {
                mediaPostId: {
                    in: normalizedMediaPostIds,
                },
            },
            _count: {
                _all: true,
            },
        }),
    ]);

    commentCounts.forEach((entry) => {
        const currentSummary = summaryMap.get(entry.mediaPostId) || createEmptyEngagementSummary();
        currentSummary.comments = entry._count._all;
        summaryMap.set(entry.mediaPostId, currentSummary);
    });

    interactionCounts.forEach((entry) => {
        const currentSummary = summaryMap.get(entry.mediaPostId) || createEmptyEngagementSummary();

        if (entry.type === MEDIA_POST_INTERACTION_TYPES.LIKE) {
            currentSummary.likes = entry._count._all;
        }

        if (entry.type === MEDIA_POST_INTERACTION_TYPES.VIDEO_VIEW) {
            currentSummary.videoViews = entry._count._all;
        }

        summaryMap.set(entry.mediaPostId, currentSummary);
    });

    return summaryMap;
}

async function ensurePublishedMediaPostExists(mediaPostId) {
    return prisma.mediaPost.findFirst({
        where: {
            id: mediaPostId,
            isPublished: true,
        },
        select: {
            id: true,
        },
    });
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
                    select: RELATED_PACKAGE_SELECT,
                },
            },
            ...(limit ? { take: limit } : {}),
        });
        const engagementSummaryMap = await buildEngagementSummaryMap(mediaPosts.map((post) => post.id));

        return res.json(mediaPosts.map((post) => (
            serializeMediaPost(post, {
                engagementSummary: readEngagementSummary(engagementSummaryMap, post.id),
            })
        )));
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
                    select: RELATED_PACKAGE_SELECT,
                },
                comments: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 2,
                    include: COMMENT_WITH_USER_INCLUDE,
                },
                interactions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: MEDIA_POST_RECENT_ACTIVITY_LIMIT,
                    include: INTERACTION_WITH_USER_INCLUDE,
                },
            },
        });
        const engagementSummaryMap = await buildEngagementSummaryMap(mediaPosts.map((post) => post.id));

        return res.json(mediaPosts.map((post) => (
            serializeMediaPost(post, {
                engagementSummary: readEngagementSummary(engagementSummaryMap, post.id),
                recentComments: post.comments || [],
                recentInteractions: post.interactions || [],
            })
        )));
    } catch (err) {
        console.error('Error fetching media posts for management:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const mediaPostId = toPositiveInteger(req.params.id);
        if (mediaPostId === null) {
            return sendInvalidId(res);
        }

        const mediaPost = await prisma.mediaPost.findFirst({
            where: {
                id: mediaPostId,
                isPublished: true,
            },
            include: {
                relatedPackage: {
                    select: RELATED_PACKAGE_SELECT,
                },
                comments: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: MEDIA_POST_PUBLIC_COMMENT_LIMIT,
                    include: COMMENT_WITH_USER_INCLUDE,
                },
            },
        });

        if (!mediaPost) {
            return res.status(404).json({ msg: 'Travel story not found.' });
        }

        const relatedStories = await prisma.mediaPost.findMany({
            where: {
                isPublished: true,
                NOT: {
                    id: mediaPostId,
                },
            },
            orderBy: [
                { displayOrder: 'asc' },
                { eventDate: 'desc' },
                { id: 'asc' },
            ],
            include: {
                relatedPackage: {
                    select: RELATED_PACKAGE_SELECT,
                },
            },
            take: 3,
        });

        const [engagementSummaryMap, relatedStorySummaryMap] = await Promise.all([
            buildEngagementSummaryMap([mediaPostId]),
            buildEngagementSummaryMap(relatedStories.map((story) => story.id)),
        ]);

        return res.json(serializeMediaPost(mediaPost, {
            engagementSummary: readEngagementSummary(engagementSummaryMap, mediaPost.id),
            comments: mediaPost.comments || [],
            relatedStories: relatedStories.map((story) => (
                serializeMediaPost(story, {
                    engagementSummary: readEngagementSummary(relatedStorySummaryMap, story.id),
                })
            )),
        }));
    } catch (err) {
        console.error('Error fetching media post details:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/comments', softAuth, async (req, res) => {
    try {
        const mediaPostId = toPositiveInteger(req.params.id);
        if (mediaPostId === null) {
            return sendInvalidId(res);
        }

        const mediaPost = await ensurePublishedMediaPostExists(mediaPostId);
        if (!mediaPost) {
            return res.status(404).json({ msg: 'Travel story not found.' });
        }

        const message = toTrimmedString(req.body?.message);
        if (!message) {
            return sendValidationError(res, 'Comment message is required.');
        }

        if (message.length > 800) {
            return sendValidationError(res, 'Comment message must be 800 characters or fewer.');
        }

        const fallbackAuthorName = toTrimmedString(req.user?.username || req.user?.name);
        const authorName = toTrimmedString(req.body?.authorName || req.body?.name) || fallbackAuthorName;
        if (!authorName) {
            return sendValidationError(res, 'Your name is required before sending a comment.');
        }

        if (authorName.length > 80) {
            return sendValidationError(res, 'Name must be 80 characters or fewer.');
        }

        const authorLocation = toTrimmedString(req.body?.authorLocation || req.body?.location) || null;
        if (authorLocation && authorLocation.length > 80) {
            return sendValidationError(res, 'Location must be 80 characters or fewer.');
        }

        const comment = await prisma.mediaPostComment.create({
            data: {
                mediaPostId,
                userId: toPositiveInteger(req.user?.id),
                authorName,
                authorLocation,
                message,
            },
            include: COMMENT_WITH_USER_INCLUDE,
        });
        const engagementSummaryMap = await buildEngagementSummaryMap([mediaPostId]);

        return res.status(201).json({
            comment: serializeMediaPostComment(comment),
            engagement: readEngagementSummary(engagementSummaryMap, mediaPostId),
        });
    } catch (err) {
        console.error('Error creating media post comment:', err.message);
        return res.status(500).send('Server Error');
    }
});

router.post('/:id/interactions', softAuth, async (req, res) => {
    try {
        const mediaPostId = toPositiveInteger(req.params.id);
        if (mediaPostId === null) {
            return sendInvalidId(res);
        }

        const interactionType = normalizeMediaPostInteractionType(req.body?.type);
        if (!interactionType) {
            return sendValidationError(res, 'Interaction type must be LIKE or VIDEO_VIEW.');
        }

        const visitorKey = toTrimmedString(req.body?.visitorKey);
        if (!visitorKey) {
            return sendValidationError(res, 'visitorKey is required.');
        }

        if (visitorKey.length > 120) {
            return sendValidationError(res, 'visitorKey must be 120 characters or fewer.');
        }

        const mediaPost = await ensurePublishedMediaPostExists(mediaPostId);
        if (!mediaPost) {
            return res.status(404).json({ msg: 'Travel story not found.' });
        }

        const compoundWhere = {
            mediaPostId_type_visitorKey: {
                mediaPostId,
                type: interactionType,
                visitorKey,
            },
        };
        const existingInteraction = await prisma.mediaPostInteraction.findUnique({
            where: compoundWhere,
        });

        if (!existingInteraction) {
            await prisma.mediaPostInteraction.create({
                data: {
                    mediaPostId,
                    userId: toPositiveInteger(req.user?.id),
                    type: interactionType,
                    visitorKey,
                },
            });
        } else if (!existingInteraction.userId && toPositiveInteger(req.user?.id) !== null) {
            await prisma.mediaPostInteraction.update({
                where: { id: existingInteraction.id },
                data: {
                    userId: toPositiveInteger(req.user?.id),
                },
            });
        }

        const engagementSummaryMap = await buildEngagementSummaryMap([mediaPostId]);

        return res.json({
            tracked: !existingInteraction,
            engagement: readEngagementSummary(engagementSummaryMap, mediaPostId),
        });
    } catch (err) {
        console.error('Error saving media post interaction:', err.message);
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
                    select: RELATED_PACKAGE_SELECT,
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
                    select: RELATED_PACKAGE_SELECT,
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
