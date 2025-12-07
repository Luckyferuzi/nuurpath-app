const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const { check } = require('express-validator');

// @route GET api/profile
// @desc Get current user's profile
// @access Private
router.get('/', authMiddleware, profileController.getProfile);

// @route PUT api/profile
// @desc Update user profile
// @access Private
router.put(
    '/',
    authMiddleware,
    [
        check('bio', 'Bio must be a string').optional().isString(),
        check('phone', 'Phone must be a string').optional().isString(),
        check('address', 'Address must be a string').optional().isString(),
        check('profilePicture', 'Profile picture must be a string').optional().isString(),
        check('preferences', 'Preferences must be an object').optional().isObject(),
    ],
    profileController.updateProfile
);

// @route GET api/profile/:userId
// @desc Get user profile by ID
// @access Public
router.get('/:userId', profileController.getUserProfile);

// @route GET api/profile/all
// @desc Get all user profiles (admin only)
// @access Private/Admin
router.get('/all', authMiddleware, adminAuthMiddleware, profileController.getAllProfiles);

module.exports = router;
