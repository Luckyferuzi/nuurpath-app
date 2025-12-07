const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// @route   GET api/flights
// @desc    Get all flight bookings (Admin only)
// @access  Private (Admin only)
router.get('/', authMiddleware, adminAuthMiddleware, flightController.getAllFlightBookings);

// @route   GET api/flights/me
// @desc    Get current user's flight bookings
// @access  Private (User)
router.get('/me', authMiddleware, flightController.getMyFlightBookings);

// @route   POST api/flights
// @desc    Create a new flight booking
// @access  Private (User/Admin)
router.post('/', authMiddleware, flightController.createFlightBooking);

// @route   GET api/flights/:id
// @desc    Get a single flight booking by ID (user can get their own, admin can get any)
// @access  Private (User/Admin)
router.get('/:id', authMiddleware, flightController.getFlightBookingById);

// @route   PUT api/flights/:id/status
// @desc    Update flight booking status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', authMiddleware, adminAuthMiddleware, flightController.updateFlightBookingStatus);

// @route   DELETE api/flights/:id
// @desc    Cancel/Delete a flight booking (User must own or Admin)
// @access  Private (User/Admin)
router.delete('/:id', authMiddleware, flightController.cancelFlightBooking);

module.exports = router;
