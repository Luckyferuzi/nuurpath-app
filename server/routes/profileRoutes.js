const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const {
    isNonEmptyString,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const { isAdmin } = require('../utils/roles');
const {
    profileImageUpload,
    runUpload,
    sendUploadError,
} = require('../utils/upload');
const {
    STORED_FILE_CATEGORIES,
    STORED_FILE_ROUTE_PREFIXES,
    buildPublicStoredFileUrl,
    createStoredFile,
    deleteStoredFilesByIds,
    extractStoredFileIdFromReference,
} = require('../utils/storedFiles');

// @route   GET api/profile
// @desc    Get current user's profile
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const profile = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                email: true,
                bio: true,
                contactInfo: true,
                profilePicture: true
            }
        });
        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/profile/:id
// @desc    Get a user profile by id (self or admin)
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const requestorId = toPositiveInteger(req.user.id);
        if (requestorId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const targetUserId = toPositiveInteger(req.params.id);
        if (targetUserId === null) {
            return sendInvalidId(res);
        }

        if (!isAdmin(req.user) && targetUserId !== requestorId) {
            return res.status(403).json({ msg: 'You do not have permission to view this profile.' });
        }

        const profile = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                name: true,
                email: true,
                bio: true,
                contactInfo: true,
                profilePicture: true
            }
        });

        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
    const { name, bio, contactInfo } = req.body;

    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        if (!isNonEmptyString(name)) {
            return sendValidationError(res, 'Name is required.');
        }

        const updatedProfile = await prisma.user.update({
            where: { id: userId },
            data: {
                name: toTrimmedString(name),
                bio: typeof bio === 'string' ? bio.trim() : bio,
                contactInfo: typeof contactInfo === 'string' ? contactInfo.trim() : contactInfo
            },
            select: {
                name: true,
                email: true,
                bio: true,
                contactInfo: true,
                profilePicture: true
            }
        });
        res.json(updatedProfile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/profile/upload-picture
// @desc    Upload profile picture
// @access  Private
router.post('/upload-picture', auth, async (req, res) => {
    try {
        await runUpload(profileImageUpload.single('profilePicture'), req, res);
    } catch (error) {
        return sendUploadError(res, error, 'File too large. Maximum size allowed is 5 MB.');
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.', msg: 'No file uploaded.' });
    }

    let createdStoredFileId = null;

    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { profilePicture: true },
        });

        if (!existingUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const storedFile = await createStoredFile({
            file: req.file,
            category: STORED_FILE_CATEGORIES.PROFILE_IMAGE,
            uploadedByUserId: userId,
        });
        createdStoredFileId = storedFile.id;
        const fileUrl = buildPublicStoredFileUrl(storedFile.id);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profilePicture: fileUrl },
            select: { profilePicture: true }
        });
        createdStoredFileId = null;

        const previousFileId = extractStoredFileIdFromReference(
            existingUser.profilePicture,
            [STORED_FILE_ROUTE_PREFIXES.PUBLIC]
        );
        if (previousFileId !== null) {
            try {
                await deleteStoredFilesByIds([previousFileId]);
            } catch (cleanupError) {
                console.warn('Failed to remove previous profile image:', cleanupError.message);
            }
        }

        res.json(updatedUser);
    } catch (err) {
        if (createdStoredFileId !== null) {
            await deleteStoredFilesByIds([createdStoredFileId]);
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/profile/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
            return sendValidationError(res, 'New password must be at least 6 characters long.');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.password) {
            if (!isNonEmptyString(currentPassword)) {
                return sendValidationError(res, 'Current password is required.');
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid current password' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                passwordChangedAt: new Date()
            }
        });

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
