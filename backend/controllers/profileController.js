const User = require('../models/User');
const AppError = require('../utils/AppError');

// @route   GET api/profile
// @desc    Get current user's profile
// @access  Private
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
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
    const { bio, phone, address, profilePicture, preferences } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Update profile fields
        if (bio) user.profile.bio = bio;
        if (phone) user.profile.phone = phone;
        if (address) user.profile.address = address;
        if (profilePicture) user.profile.profilePicture = profilePicture;
        if (preferences) user.profile.preferences = preferences;

        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
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
        const user = await User.findById(req.params.userId).select('-password');
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
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error fetching all profiles', 500));
    }
};
