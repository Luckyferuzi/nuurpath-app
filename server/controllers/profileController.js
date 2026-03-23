const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// @route   GET api/profile
// @desc    Get current user's profile
// @access  Private
exports.getProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return next(new AppError('User not found', 404));
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching profile', 500));
    }
};

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    const { name, email, username } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name,
                email,
                username
            },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });

        res.json(user);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error updating profile', 500));
    }
};

// @route   GET api/profile/:userId
// @desc    Get user profile by ID (for admin or public profiles)
// @access  Public
exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return next(new AppError('User not found', 404));
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching user profile', 500));
    }
};

// @route   GET api/profile/all
// @desc    Get all user profiles (admin only)
// @access  Private/Admin
exports.getAllProfiles = async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching all profiles', 500));
    }
};
