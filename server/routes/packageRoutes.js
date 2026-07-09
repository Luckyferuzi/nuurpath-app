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
    toPublicUploadUrl,
} = require('../utils/upload');

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

    try {
        const { error, data } = getValidatedPackagePayload(req.body);
        if (error) {
            removeUploadedFiles(req.file);
            return sendValidationError(res, error);
        }

        const packageData = {
            ...data,
            images: req.file ? [toPublicUploadUrl('packages', req.file.filename)] : []
        };

        const newPackage = await prisma.package.create({
            data: packageData
        });

        res.json(newPackage);
    } catch (err) {
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

        const updateData = { ...data };

        if (req.file) {
            updateData.images = [toPublicUploadUrl('packages', req.file.filename)];
        }

        const updatedPackage = await prisma.package.update({
            where: { id },
            data: updateData
        });

        res.json(updatedPackage);
    } catch (err) {
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

        await prisma.package.delete({
            where: { id }
        });
        res.json({ msg: 'Package removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
