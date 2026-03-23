const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const auth = require('../middleware/auth');

// @route   GET api/users
// @desc    Get all users with pagination
// @access  Private (Admin/Manager)
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Check role
        const requestor = await prisma.user.findUnique({ where: { id: parseInt(req.user.id) } });
        if (!requestor || !['admin', 'manager'].includes(requestor.role)) {
             return res.status(403).json({ msg: 'Access denied' });
        }

        const [users, totalUsers] = await prisma.$transaction([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, email: true, role: true, createdAt: true }
            }),
            prisma.user.count()
        ]);

        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/users
// @desc    Create a new user
// @access  Private (Admin)
router.post('/', auth, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const requestor = await prisma.user.findUnique({ where: { id: parseInt(req.user.id) } });
        if (requestor.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'user'
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });

        res.json(newUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const id = parseInt(req.params.id);

        const requestor = await prisma.user.findUnique({ where: { id: parseInt(req.user.id) } });
        if (requestor.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const updateData = { name, email, role };
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true }
        });

        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requestorId = parseInt(req.user.id);

        const requestor = await prisma.user.findUnique({ where: { id: requestorId } });
        if (requestor.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        if (requestorId === id) {
            return res.status(400).json({ msg: 'Cannot delete yourself' });
        }

        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;