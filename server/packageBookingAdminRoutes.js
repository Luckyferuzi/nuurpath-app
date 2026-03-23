const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/package-bookings
// @desc    Get ALL Package Bookings (for Admin)
// @access  Private (Admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const bookings = await prisma.packageBooking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        package: true
      }
    });
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching package bookings:", err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/package-bookings/:id
// @desc    Update Booking Status (for Admin)
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const updated = await prisma.packageBooking.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json(updated);
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;