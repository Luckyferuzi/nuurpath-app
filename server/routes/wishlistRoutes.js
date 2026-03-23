const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');

// @route   GET api/wishlist
// @desc    Get user's wishlist
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const wishlist = await prisma.wishlist.findMany({
            where: { userId: req.user.id },
            include: { package: true }
        });
        res.json(wishlist);
    } catch (err) {
        console.error('Error fetching wishlist:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/wishlist/:packageId
// @desc    Toggle wishlist item
// @access  Private
router.post('/:packageId', auth, async (req, res) => {
    try {
        const packageId = parseInt(req.params.packageId);
        const userId = req.user.id;

        if (isNaN(packageId)) {
            return res.status(400).json({ msg: 'Invalid package ID' });
        }

        // Check if package exists
        const pkg = await prisma.package.findUnique({ where: { id: packageId } });
        if (!pkg) {
            return res.status(404).json({ msg: 'Package not found' });
        }

        const existing = await prisma.wishlist.findFirst({
            where: { userId, packageId }
        });

        if (existing) {
            await prisma.wishlist.delete({ where: { id: existing.id } });
            return res.json({ msg: 'Removed from wishlist', action: 'removed' });
        }

        const newItem = await prisma.wishlist.create({
            data: { userId, packageId }
        });
        res.json(newItem);
    } catch (err) {
        console.error('Error toggling wishlist:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/wishlist/check/:packageId
// @desc    Check if package is in wishlist
// @access  Private
router.get('/check/:packageId', auth, async (req, res) => {
    try {
        const packageId = parseInt(req.params.packageId);
        if (isNaN(packageId)) return res.json({ isWishlisted: false });

        const existing = await prisma.wishlist.findFirst({
            where: { userId: req.user.id, packageId }
        });
        res.json({ isWishlisted: !!existing });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/wishlist
// @desc    Clear user's wishlist
// @access  Private
router.delete('/', auth, async (req, res) => {
    try {
        await prisma.wishlist.deleteMany({
            where: { userId: req.user.id }
        });
        res.json({ msg: 'Wishlist cleared' });
    } catch (err) {
        console.error('Error clearing wishlist:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;