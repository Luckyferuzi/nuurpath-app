const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllPackages = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', featured } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const where = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { destination: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (featured === 'true') {
            where.isFeatured = true;
        }

        const total = await prisma.travelPackage.count({ where });
        const packages = await prisma.travelPackage.findMany({
            where,
            skip: parseInt(skip),
            take: parseInt(limit),
            orderBy: featured ? { featuredOrder: 'asc' } : { createdAt: 'desc' }
        });

        res.json({
            packages,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalPackages: total
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const getPackageById = async (req, res) => {
    try {
        const pkg = await prisma.travelPackage.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!pkg) return res.status(404).json({ msg: 'Package not found' });
        res.json(pkg);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const createPackage = async (req, res) => {
    try {
        const { title, destination, duration, type, price, description, isFeatured } = req.body;
        
        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newPackage = await prisma.travelPackage.create({
            data: {
                title,
                destination,
                duration,
                type,
                price: parseFloat(price),
                description,
                isFeatured: isFeatured === 'true',
                images
            }
        });

        res.json(newPackage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const updatePackage = async (req, res) => {
    try {
        const { title, destination, duration, type, price, description, isFeatured, existingImages } = req.body;
        
        let currentImages = [];
        if (existingImages) {
            currentImages = Array.isArray(existingImages) ? existingImages : [existingImages];
        }
        
        const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const finalImages = [...currentImages, ...newImages];

        const updatedPackage = await prisma.travelPackage.update({
            where: { id: parseInt(req.params.id) },
            data: {
                title,
                destination,
                duration,
                type,
                price: parseFloat(price),
                description,
                isFeatured: isFeatured === 'true',
                images: finalImages
            }
        });

        res.json(updatedPackage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const deletePackage = async (req, res) => {
    try {
        await prisma.travelPackage.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ msg: 'Package removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const uploadSingleImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
};

const reorderPackages = async (req, res) => {
    try {
        const packageIds = req.body; // Array of IDs in order
        
        const updates = packageIds.map((id, index) => 
            prisma.travelPackage.update({
                where: { id: parseInt(id) },
                data: { featuredOrder: index }
            })
        );

        await prisma.$transaction(updates);
        res.json({ msg: 'Packages reordered' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    uploadSingleImage,
    reorderPackages
};