const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for package images
const uploadDir = path.join(__dirname, '../public/uploads/packages');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// @route   GET api/packages
// @desc    Get all packages
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { page, limit, search, minPrice, maxPrice } = req.query;
        const hasPagination = page !== undefined || limit !== undefined;

        if (hasPagination) {
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 10;
            const skip = (pageNum - 1) * limitNum;

            // Build filter object
            const where = {};
            if (search) {
                where.OR = [
                    { destination: { contains: search, mode: 'insensitive' } },
                    { title: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (minPrice && !isNaN(parseFloat(minPrice))) {
                where.price = { ...where.price, gte: parseFloat(minPrice) };
            }
            if (maxPrice && !isNaN(parseFloat(maxPrice))) {
                where.price = { ...where.price, lte: parseFloat(maxPrice) };
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
        const pkg = await prisma.package.findUnique({
            where: { id: parseInt(req.params.id) }
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
router.post('/', auth, adminAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, description, price, destination, duration, type, itinerary } = req.body;
        
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
            return res.status(400).json({ msg: 'Price must be a valid number' });
        }

        const packageData = {
            title,
            description,
            price: parsedPrice,
            destination,
            duration,
            type,
            itinerary,
            images: req.file ? [`/uploads/packages/${req.file.filename}`] : []
        };

        const newPackage = await prisma.package.create({
            data: packageData
        });

        res.json(newPackage);
    } catch (err) {
        console.error('Error in POST /api/packages:', err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/packages/:id
// @desc    Update a package
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, description, price, destination, duration, type, itinerary } = req.body;
        const id = parseInt(req.params.id);

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
            return res.status(400).json({ msg: 'Price must be a valid number' });
        }

        const updateData = {
            title,
            description,
            price: parsedPrice,
            destination,
            duration,
            type,
            itinerary
        };

        if (req.file) {
            updateData.images = [`/uploads/packages/${req.file.filename}`];
        }

        const updatedPackage = await prisma.package.update({
            where: { id },
            data: updateData
        });

        res.json(updatedPackage);
    } catch (err) {
        console.error('Error in PUT /api/packages:', err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/packages/:id
// @desc    Delete a package
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        await prisma.package.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ msg: 'Package removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;