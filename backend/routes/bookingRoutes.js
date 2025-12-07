const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// @route GET api/bookings (Admin only)
router.get('/', authMiddleware, adminAuthMiddleware, bookingController.getAllBookings);

// @route GET api/bookings/me
router.get('/me', authMiddleware, bookingController.getMyBookings);

// @route POST api/bookings
router.post('/', authMiddleware, bookingController.createBooking);

// @route PUT api/bookings/:id/status (Admin only)
router.put('/:id/status', authMiddleware, adminAuthMiddleware, bookingController.updateBookingStatus);

module.exports = router;
