const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const {
    isNonEmptyString,
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

    return {
        data: {
            title: toTrimmedString(title),
            description: toTrimmedString(description),
            price: parsedPrice,
            destination: toTrimmedString(destination),
            duration: toTrimmedString(duration),
            type: toTrimmedString(type),
            itinerary: typeof itinerary === 'string' ? itinerary.trim() : itinerary,
        },
    };
}

// @route   GET api/packages
// @desc    Get all packages
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { page, limit, search, minPrice, maxPrice } = req.query;
        const hasPagination = page !== undefined || limit !== undefined;

        if (hasPagination) {
            const pageNum = page === undefined ? 1 : toPositiveInteger(page);
            const limitNum = limit === undefined ? 10 : toPositiveInteger(limit);

            if (pageNum === null || limitNum === null) {
                return sendValidationError(res, 'Page and limit must be positive integers.');
            }

            const skip = (pageNum - 1) * limitNum;

            // Build filter object
            const where = {};
            if (search) {
                where.OR = [
                    { destination: { contains: search, mode: 'insensitive' } },
                    { title: { contains: search, mode: 'insensitive' } }
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

            const [packages, total] = await prisma.$transaction([
                prisma.package.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.package.count({ where })
            ]);

            return res.json({
                packages,
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalPackages: total
            });
        } else {
            const packages = await prisma.package.findMany({
                orderBy: { createdAt: 'desc' }
            });
            res.json(packages);
        }
    } catch (err) {
        console.error('Error in GET /api/packages:', err);
        res.status(500).send('Server Error');
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
            where: { id }
        });
        if (!pkg) return res.status(404).json({ msg: 'Package not found' });
        res.json(pkg);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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

        const packageData = {
            ...data,
            images: storedFile ? [buildPublicStoredFileUrl(storedFile.id)] : []
        };

        const newPackage = await prisma.package.create({
            data: packageData
        });
        createdStoredFileId = null;

        res.json(newPackage);
    } catch (err) {
        if (createdStoredFileId !== null) {
            await deleteStoredFilesByIds([createdStoredFileId]);
        }
        removeUploadedFiles(req.file);
        console.error('Error in POST /api/packages:', err);
        res.status(500).send('Server Error');
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
            select: { images: true },
        });
        if (!existingPackage) {
            removeUploadedFiles(req.file);
            return res.status(404).json({ msg: 'Package not found' });
        }

        const updateData = { ...data };
        let storedFile = null;

        if (req.file) {
            const userId = toPositiveInteger(req.user.id);
            storedFile = await createStoredFile({
                file: req.file,
                category: STORED_FILE_CATEGORIES.PACKAGE_IMAGE,
                uploadedByUserId: userId,
            });
            createdStoredFileId = storedFile.id;
            updateData.images = [buildPublicStoredFileUrl(storedFile.id)];
        }

        const updatedPackage = await prisma.package.update({
            where: { id },
            data: updateData
        });
        createdStoredFileId = null;

        if (storedFile) {
            try {
                await deleteStoredFilesByReferences(existingPackage.images || [], [STORED_FILE_ROUTE_PREFIXES.PUBLIC]);
            } catch (cleanupError) {
                console.warn('Failed to remove previous package image:', cleanupError.message);
            }
        }

        res.json(updatedPackage);
    } catch (err) {
        if (createdStoredFileId !== null) {
            await deleteStoredFilesByIds([createdStoredFileId]);
        }
        removeUploadedFiles(req.file);
        console.error('Error in PUT /api/packages:', err);
        res.status(500).send('Server Error');
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
            select: { images: true },
        });
        if (!existingPackage) {
            return res.status(404).json({ msg: 'Package not found' });
        }

        await prisma.package.delete({
            where: { id }
        });

        try {
            await deleteStoredFilesByReferences(existingPackage.images || [], [STORED_FILE_ROUTE_PREFIXES.PUBLIC]);
        } catch (cleanupError) {
            console.warn('Failed to remove deleted package images:', cleanupError.message);
        }

        res.json({ msg: 'Package removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
