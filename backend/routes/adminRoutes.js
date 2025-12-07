const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const { check } = require('express-validator');

// @route GET api/admin/stats
// @desc Get admin dashboard statistics
// @access Private/Admin
router.get('/stats', authMiddleware, adminAuthMiddleware, adminController.getDashboardStats);

// @route GET api/admin/users
// @desc Get all users (admin only)
// @access Private/Admin
router.get('/users', authMiddleware, adminAuthMiddleware, adminController.getAllUsers);

// @route PUT api/admin/users/:userId/role
// @desc Update user role (admin only)
// @access Private/Admin
router.put(
    '/users/:userId/role',
    authMiddleware,
    adminAuthMiddleware,
    [
        check('role', 'Role is required').not().isEmpty(),
        check('role', 'Role must be either user or admin').isIn(['user', 'admin']),
    ],
    adminController.updateUserRole
);

// @route DELETE api/admin/users/:userId
// @desc Delete user (admin only)
// @access Private/Admin
router.delete('/users/:userId', authMiddleware, adminAuthMiddleware, adminController.deleteUser);

// @route GET api/admin/bookings
// @desc Get all bookings (admin only)
// @access Private/Admin
router.get('/bookings', authMiddleware, adminAuthMiddleware, adminController.getAllBookings);

// @route DELETE api/admin/bookings/:bookingId
// @desc Delete booking (admin only)
// @access Private/Admin
router.delete('/bookings/:bookingId', authMiddleware, adminAuthMiddleware, adminController.deleteBooking);

module.exports = router;
