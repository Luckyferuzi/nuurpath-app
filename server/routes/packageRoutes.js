const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const {
    isNonEmptyString,
    normalizeBoolean,
    sendInvalidId,
    sendValidationError,
    toNonNegativeNumber,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const {
    packageImageUpload,
    removeUploadedFiles,
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

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function buildPackageOrderBy() {
    return [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
    ];
}

function parseJourneyStops(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return { data: null };
    }

    let parsedValue = rawValue;
    if (typeof rawValue === 'string') {
        try {
            parsedValue = JSON.parse(rawValue);
        } catch (error) {
            return { error: 'Journey stops must be a valid JSON array.' };
        }
    }

    if (!Array.isArray(parsedValue)) {
        return { error: 'Journey stops must be provided as an array.' };
    }

    const normalizedStops = [];

    for (let index = 0; index < parsedValue.length; index += 1) {
        const stop = parsedValue[index];
        if (!stop || typeof stop !== 'object' || Array.isArray(stop)) {
            return { error: `Journey stop ${index + 1} is invalid.` };
        }

        const city = toTrimmedString(stop.city || stop.destination || stop.name);
        if (!city) {
            return { error: `Journey stop ${index + 1} must include a city.` };
        }

        const stayLabel = toTrimmedString(stop.stayLabel || stop.duration || stop.dayRange);
        const accommodation = toTrimmedString(stop.accommodation);
        const notes = toTrimmedString(stop.notes || stop.description);
        const image = toTrimmedString(stop.image);

        normalizedStops.push({
            order: index + 1,
            city,
            stayLabel: stayLabel || null,
            accommodation: accommodation || null,
            notes: notes || null,
            image: image || null,
        });
    }

    return {
        data: normalizedStops.length > 0 ? normalizedStops : null,
    };
}

function getValidatedPackagePayload(body) {
    const { title, description, price, destination, duration, type, itinerary } = body;

    if (!isNonEmptyString(title)) {
        return { error: 'Package title is required.' };
    }

    if (!isNonEmptyString(description)) {
        return { error: 'Package description is required.' };
    }

    if (!isNonEmptyString(destination)) {
        return { error: 'Package destination is required.' };
    }

    if (!isNonEmptyString(duration)) {
        return { error: 'Package duration is required.' };
    }

    if (!isNonEmptyString(type)) {
        return { error: 'Package type is required.' };
    }

    const parsedPrice = toNonNegativeNumber(price);
    if (parsedPrice === null) {
        return { error: 'Price must be a valid non-negative number.' };
    }

    const payload = {
        title: toTrimmedString(title),
        description: toTrimmedString(description),
        price: parsedPrice,
        destination: toTrimmedString(destination),
        duration: toTrimmedString(duration),
        type: toTrimmedString(type),
        itinerary: typeof itinerary === 'string' ? itinerary.trim() : itinerary,
    };

    if (hasOwn(body, 'journeyStops')) {
        const parsedJourneyStops = parseJourneyStops(body.journeyStops);
        if (parsedJourneyStops.error) {
            return { error: parsedJourneyStops.error };
        }

        payload.journeyStops = parsedJourneyStops.data;
    }

    if (hasOwn(body, 'isFeatured')) {
        const parsedIsFeatured = normalizeBoolean(body.isFeatured);
        if (parsedIsFeatured === null) {
            return { error: 'Featured status must be true or false.' };
        }

        payload.isFeatured = parsedIsFeatured;
    }

    if (hasOwn(body, 'featuredOrder')) {
        if (body.featuredOrder === '' || body.featuredOrder === null) {
            payload.featuredOrder = null;
        } else {
            const parsedFeaturedOrder = toPositiveInteger(body.featuredOrder);
            if (parsedFeaturedOrder === null) {
                return { error: 'Featured order must be a positive integer.' };
            }

            payload.featuredOrder = parsedFeaturedOrder;
        }
    }

    if (hasOwn(body, 'displayOrder')) {
        const parsedDisplayOrder = toPositiveInteger(body.displayOrder);
        if (parsedDisplayOrder === null) {
            return { error: 'Display order must be a positive integer.' };
        }

        payload.displayOrder = parsedDisplayOrder;
    }

    return { data: payload };
}

async function getNextDisplayOrder(transactionClient) {
    const result = await transactionClient.package.aggregate({
        _max: {
            displayOrder: true,
        },
    });

    return (result?._max?.displayOrder || 0) + 1;
}

async function getNextFeaturedOrder(transactionClient, excludedPackageId = null) {
    const where = {
        isFeatured: true,
    };

    if (excludedPackageId !== null) {
        where.NOT = {
            id: excludedPackageId,
        };
    }

    const result = await transactionClient.package.aggregate({
        where,
        _max: {
            featuredOrder: true,
        },
    });

    return (result?._max?.featuredOrder || 0) + 1;
}

async function compactPackageOrderState(transactionClient) {
    const packages = await transactionClient.package.findMany({
        orderBy: buildPackageOrderBy(),
        select: {
            id: true,
            isFeatured: true,
        },
    });

    const featuredPackages = packages.filter((pkg) => pkg.isFeatured);

    for (let index = 0; index < packages.length; index += 1) {
        await transactionClient.package.update({
            where: { id: packages[index].id },
            data: {
                displayOrder: index + 1,
                featuredOrder: packages[index].isFeatured ? undefined : null,
            },
        });
    }

    for (let index = 0; index < featuredPackages.length; index += 1) {
        await transactionClient.package.update({
            where: { id: featuredPackages[index].id },
            data: {
                featuredOrder: index + 1,
            },
        });
    }
}

async function buildPackagePersistenceData(transactionClient, payload, options = {}) {
    const {
        existingPackage = null,
        storedFile = null,
    } = options;
    const isCreate = !existingPackage;
    const resolvedIsFeatured = payload.isFeatured ?? existingPackage?.isFeatured ?? false;
    const packageData = {
        title: payload.title,
        description: payload.description,
        price: payload.price,
        destination: payload.destination,
        duration: payload.duration,
        type: payload.type,
        itinerary: payload.itinerary,
        isFeatured: resolvedIsFeatured,
        journeyStops: hasOwn(payload, 'journeyStops')
            ? payload.journeyStops
            : existingPackage?.journeyStops ?? null,
    };

    if (storedFile) {
        packageData.images = [buildPublicStoredFileUrl(storedFile.id)];
    } else if (isCreate) {
        packageData.images = [];
    }

    if (isCreate) {
        packageData.displayOrder = payload.displayOrder ?? await getNextDisplayOrder(transactionClient);
    } else if (payload.displayOrder !== undefined) {
        packageData.displayOrder = payload.displayOrder;
    }

    if (resolvedIsFeatured) {
        if (payload.featuredOrder !== undefined && payload.featuredOrder !== null) {
            packageData.featuredOrder = payload.featuredOrder;
        } else if (payload.featuredOrder === null) {
            packageData.featuredOrder = await getNextFeaturedOrder(transactionClient, existingPackage?.id || null);
        } else if (!existingPackage || !existingPackage.isFeatured || existingPackage.featuredOrder === null) {
            packageData.featuredOrder = await getNextFeaturedOrder(transactionClient, existingPackage?.id || null);
        } else {
            packageData.featuredOrder = existingPackage.featuredOrder;
        }
    } else {
        packageData.featuredOrder = null;
    }

    return packageData;
}

// @route   GET api/packages
// @desc    Get all packages
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { page, limit, search, minPrice, maxPrice } = req.query;
        const hasPagination = page !== undefined || limit !== undefined;
        const where = {};

        if (search) {
            where.OR = [
                { destination: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (minPrice !== undefined) {
            const parsedMinPrice = toNonNegativeNumber(minPrice);
            if (parsedMinPrice === null) {
                return sendValidationError(res, 'Minimum price must be a valid non-negative number.');
            }

            where.price = { ...where.price, gte: parsedMinPrice };
        }

        if (maxPrice !== undefined) {
            const parsedMaxPrice = toNonNegativeNumber(maxPrice);
            if (parsedMaxPrice === null) {
                return sendValidationError(res, 'Maximum price must be a valid non-negative number.');
            }

            where.price = { ...where.price, lte: parsedMaxPrice };
        }

        if (where.price && where.price.gte !== undefined && where.price.lte !== undefined && where.price.gte > where.price.lte) {
            return sendValidationError(res, 'Minimum price cannot be greater than maximum price.');
        }

        if (hasPagination) {
            const pageNum = page === undefined ? 1 : toPositiveInteger(page);
            const limitNum = limit === undefined ? 10 : toPositiveInteger(limit);

            if (pageNum === null || limitNum === null) {
                return sendValidationError(res, 'Page and limit must be positive integers.');
            }

            const skip = (pageNum - 1) * limitNum;

            const [packages, total] = await prisma.$transaction([
                prisma.package.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: buildPackageOrderBy(),
                }),
                prisma.package.count({ where }),
            ]);

            return res.json({
                packages,
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalPackages: total,
            });
        }

        const packages = await prisma.package.findMany({
            where,
            orderBy: buildPackageOrderBy(),
        });

        return res.json(packages);
    } catch (err) {
        console.error('Error in GET /api/packages:', err);
        return res.status(500).send('Server Error');
    }
});

// @route   PUT api/packages/reorder
// @desc    Reorder packages and featured sequence
// @access  Private (Admin)
router.put('/reorder', auth, requireAdmin, async (req, res) => {
    try {
        const packageUpdates = Array.isArray(req.body?.packages) ? req.body.packages : null;

        if (!packageUpdates || packageUpdates.length === 0) {
            return sendValidationError(res, 'Package order payload is required.');
        }

        const seenIds = new Set();
        const seenDisplayOrders = new Set();
        const seenFeaturedOrders = new Set();
        const normalizedUpdates = [];

        for (const item of packageUpdates) {
            const id = toPositiveInteger(item?.id);
            const displayOrder = toPositiveInteger(item?.displayOrder);
            const isFeatured = normalizeBoolean(item?.isFeatured);

            if (id === null) {
                return sendValidationError(res, 'Each package update must include a valid id.');
            }

            if (displayOrder === null) {
                return sendValidationError(res, 'Each package update must include a valid display order.');
            }

            if (isFeatured === null) {
                return sendValidationError(res, 'Each package update must include a valid featured status.');
            }

            if (seenIds.has(id)) {
                return sendValidationError(res, 'Package order payload contains duplicate package ids.');
            }

            if (seenDisplayOrders.has(displayOrder)) {
                return sendValidationError(res, 'Display order values must be unique.');
            }

            let featuredOrder = null;
            if (isFeatured) {
                if (item.featuredOrder !== undefined && item.featuredOrder !== null && item.featuredOrder !== '') {
                    featuredOrder = toPositiveInteger(item.featuredOrder);
                    if (featuredOrder === null) {
                        return sendValidationError(res, 'Featured order values must be positive integers.');
                    }

                    if (seenFeaturedOrders.has(featuredOrder)) {
                        return sendValidationError(res, 'Featured order values must be unique.');
                    }

                    seenFeaturedOrders.add(featuredOrder);
                }
            }

            seenIds.add(id);
            seenDisplayOrders.add(displayOrder);
            normalizedUpdates.push({
                id,
                displayOrder,
                isFeatured,
                featuredOrder,
            });
        }

        await prisma.$transaction(
            normalizedUpdates.map((item) => prisma.package.update({
                where: { id: item.id },
                data: {
                    displayOrder: item.displayOrder,
                    isFeatured: item.isFeatured,
                    featuredOrder: item.isFeatured ? item.featuredOrder : null,
                },
            }))
        );

        const packages = await prisma.package.findMany({
            orderBy: buildPackageOrderBy(),
        });

        return res.json({
            success: true,
            packages,
        });
    } catch (err) {
        console.error('Error in PUT /api/packages/reorder:', err);
        return res.status(500).send('Server Error');
    }
});

// @route   GET api/packages/:id
// @desc    Get package by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const pkg = await prisma.package.findUnique({
            where: { id },
        });

        if (!pkg) {
            return res.status(404).json({ msg: 'Package not found' });
        }

        return res.json(pkg);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// @route   POST api/packages
// @desc    Create a package
// @access  Private (Admin)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        await runUpload(packageImageUpload.single('image'), req, res);
    } catch (error) {
        return sendUploadError(res, error, 'File too large. Maximum size allowed is 5 MB.');
    }

    let createdStoredFileId = null;

    try {
        const { error, data } = getValidatedPackagePayload(req.body);
        if (error) {
            removeUploadedFiles(req.file);
            return sendValidationError(res, error);
        }

        let storedFile = null;
        if (req.file) {
            const userId = toPositiveInteger(req.user.id);
            storedFile = await createStoredFile({
                file: req.file,
                category: STORED_FILE_CATEGORIES.PACKAGE_IMAGE,
                uploadedByUserId: userId,
            });
            createdStoredFileId = storedFile.id;
        }

        const packageData = await buildPackagePersistenceData(prisma, data, {
            storedFile,
        });

        const newPackage = await prisma.package.create({
            data: packageData,
        });
        createdStoredFileId = null;

        return res.json(newPackage);
    } catch (err) {
        if (createdStoredFileId !== null) {
            await deleteStoredFilesByIds([createdStoredFileId]);
        }

        removeUploadedFiles(req.file);
        console.error('Error in POST /api/packages:', err);
        return res.status(500).send('Server Error');
    }
});

// @route   PUT api/packages/:id
// @desc    Update a package
// @access  Private (Admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        await runUpload(packageImageUpload.single('image'), req, res);
    } catch (error) {
        return sendUploadError(res, error, 'File too large. Maximum size allowed is 5 MB.');
    }

    let createdStoredFileId = null;

    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            removeUploadedFiles(req.file);
            return sendInvalidId(res);
        }

        const { error, data } = getValidatedPackagePayload(req.body);
        if (error) {
            removeUploadedFiles(req.file);
            return sendValidationError(res, error);
        }

        const existingPackage = await prisma.package.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                images: true,
                displayOrder: true,
                isFeatured: true,
                featuredOrder: true,
                journeyStops: true,
            },
        });
        if (!existingPackage) {
            removeUploadedFiles(req.file);
            return res.status(404).json({ msg: 'Package not found' });
        }

        let storedFile = null;
        if (req.file) {
            const userId = toPositiveInteger(req.user.id);
            storedFile = await createStoredFile({
                file: req.file,
                category: STORED_FILE_CATEGORIES.PACKAGE_IMAGE,
                uploadedByUserId: userId,
            });
            createdStoredFileId = storedFile.id;
        }

        const updateData = await buildPackagePersistenceData(prisma, data, {
            existingPackage,
            storedFile,
        });

        const updatedPackage = await prisma.package.update({
            where: { id },
            data: updateData,
        });
        createdStoredFileId = null;

        if (updatedPackage.title !== existingPackage.title) {
            await prisma.packageBooking.updateMany({
                where: { packageId: id },
                data: {
                    packageTitleSnapshot: updatedPackage.title,
                },
            });
        }

        if (storedFile) {
            try {
                await deleteStoredFilesByReferences(existingPackage.images || [], [STORED_FILE_ROUTE_PREFIXES.PUBLIC]);
            } catch (cleanupError) {
                console.warn('Failed to remove previous package image:', cleanupError.message);
            }
        }

        return res.json(updatedPackage);
    } catch (err) {
        if (createdStoredFileId !== null) {
            await deleteStoredFilesByIds([createdStoredFileId]);
        }

        removeUploadedFiles(req.file);
        console.error('Error in PUT /api/packages:', err);
        return res.status(500).send('Server Error');
    }
});

// @route   DELETE api/packages/:id
// @desc    Delete a package
// @access  Private (Admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const existingPackage = await prisma.package.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                images: true,
            },
        });
        if (!existingPackage) {
            return res.status(404).json({ msg: 'Package not found' });
        }

        await prisma.$transaction(async (transactionClient) => {
            await transactionClient.packageBooking.updateMany({
                where: { packageId: id },
                data: {
                    packageTitleSnapshot: existingPackage.title,
                },
            });

            await transactionClient.package.delete({
                where: { id },
            });

            await compactPackageOrderState(transactionClient);
        });

        try {
            await deleteStoredFilesByReferences(existingPackage.images || [], [STORED_FILE_ROUTE_PREFIXES.PUBLIC]);
        } catch (cleanupError) {
            console.warn('Failed to remove deleted package images:', cleanupError.message);
        }

        return res.json({ msg: 'Package removed' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

module.exports = router;
