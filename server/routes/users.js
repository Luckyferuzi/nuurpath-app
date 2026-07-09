const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');
const {
    ADMIN_ROLE,
    MANAGER_ROLE,
    USER_ROLE,
    normalizeRole,
} = require('../utils/roles');
const {
    isNonEmptyString,
    isValidEmail,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');

const CREATABLE_ROLES = new Set([USER_ROLE, MANAGER_ROLE]);
const MANAGED_ROLES = new Set([USER_ROLE, MANAGER_ROLE, ADMIN_ROLE]);

async function countAdmins() {
    return prisma.user.count({
        where: {
            role: {
                equals: ADMIN_ROLE,
                mode: 'insensitive',
            },
        },
    });
}

// @route   GET api/users
// @desc    Get all users with pagination
// @access  Private (Admin)
router.get('/', auth, requireAdmin, async (req, res) => {
    try {
        const page = req.query.page === undefined ? 1 : toPositiveInteger(req.query.page);
        if (page === null) {
            return sendValidationError(res, 'Page must be a positive integer.');
        }

        const limit = 10;
        const skip = (page - 1) * limit;

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
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedRole = normalizeRole(role, USER_ROLE);

        if (!isNonEmptyString(name)) {
            return sendValidationError(res, 'Name is required.');
        }

        if (!isValidEmail(email)) {
            return sendValidationError(res, 'A valid email is required.');
        }

        if (!isNonEmptyString(password) || password.length < 6) {
            return sendValidationError(res, 'Password must be at least 6 characters long.');
        }

        if (!CREATABLE_ROLES.has(normalizedRole)) {
            return sendValidationError(res, 'Admins can create only user or manager accounts from this page.');
        }

        const normalizedEmail = toTrimmedString(email);

        const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                name: toTrimmedString(name),
                email: normalizedEmail,
                password: hashedPassword,
                role: normalizedRole,
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        res.status(201).json(newUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const existingUser = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true },
        });
        if (!existingUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const updateData = {};

        if (name !== undefined) {
            if (!isNonEmptyString(name)) {
                return sendValidationError(res, 'Name is required.');
            }

            updateData.name = toTrimmedString(name);
        }

        if (email !== undefined) {
            if (!isValidEmail(email)) {
                return sendValidationError(res, 'A valid email is required.');
            }

            const normalizedEmail = toTrimmedString(email);
            if (normalizedEmail !== existingUser.email) {
                const duplicateUser = await prisma.user.findUnique({
                    where: { email: normalizedEmail },
                    select: { id: true },
                });

                if (duplicateUser) {
                    return res.status(400).json({ msg: 'User already exists' });
                }
            }

            updateData.email = normalizedEmail;
        }

        if (role !== undefined) {
            const normalizedRole = normalizeRole(role, '');
            if (!MANAGED_ROLES.has(normalizedRole)) {
                return sendValidationError(res, 'Role must be user, manager, or admin.');
            }

            if (normalizeRole(existingUser.role, USER_ROLE) === ADMIN_ROLE && normalizedRole !== ADMIN_ROLE) {
                const adminCount = await countAdmins();
                if (adminCount <= 1) {
                    return res.status(400).json({ msg: 'You cannot demote the last remaining admin.' });
                }
            }

            updateData.role = normalizedRole;
        }

        if (password) {
            if (!isNonEmptyString(password) || password.length < 6) {
                return sendValidationError(res, 'Password must be at least 6 characters long.');
            }

            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
            updateData.passwordChangedAt = new Date();
        }

        if (Object.keys(updateData).length === 0) {
            return sendValidationError(res, 'No valid user fields were provided for update.');
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true },
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
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        const requestorId = toPositiveInteger(req.user.id);
        if (id === null || requestorId === null) {
            return sendInvalidId(res);
        }

        if (requestorId === id) {
            return res.status(400).json({ msg: 'Cannot delete yourself' });
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true },
        });
        if (!userToDelete) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (normalizeRole(userToDelete.role, USER_ROLE) === ADMIN_ROLE) {
            const adminCount = await countAdmins();
            if (adminCount <= 1) {
                return res.status(400).json({ msg: 'You cannot delete the last remaining admin.' });
            }
        }

        await prisma.user.delete({ where: { id } });
        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
