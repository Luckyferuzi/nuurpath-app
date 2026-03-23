const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { check, validationResult } = require('express-validator');
const { generateReceiptDoc } = require('../utils/receiptGenerator');
const { sendBookingConfirmationEmail } = require('../utils/emailService');

// Note: These routes should be protected by admin middleware in a real application.

// @route   GET /api/package-bookings
// @desc    Get ALL Package Bookings (for Admin)
// @access  Public (for now)
router.get('/', async (req, res) => {
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

// @route   POST /api/package-bookings
// @desc    Create a booking (Admin)
// @access  Private (Admin)
router.post('/', [auth, adminAuth, [
    check('packageId', 'Package is required').not().isEmpty(),
    check('contactName', 'Name is required').not().isEmpty(),
    check('contactEmail', 'Email is required').isEmail()
]], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { packageId, contactName, contactEmail, contactPhone, travelDate, passengers, status } = req.body;

        // Try to find user by email to link, otherwise link to admin (req.user.id)
        // In a real app, you might create a new user here.
        let userId = req.user.id;
        const existingUser = await prisma.user.findUnique({ where: { email: contactEmail } });
        if (existingUser) {
            userId = existingUser.id;
        }

        const newBooking = await prisma.packageBooking.create({
            data: {
                userId,
                packageId: parseInt(packageId),
                contactName,
                contactEmail,
                contactPhone: contactPhone || '',
                travelDate: new Date(travelDate),
                passengers: parseInt(passengers),
                status: status || 'Pending'
            },
            include: { user: true, package: true }
        });
        res.json(newBooking);
    } catch (err) {
        console.error("Error creating booking:", err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/package-bookings/:id
// @desc    Update Booking Status (for Admin)
// @access  Public (for now)
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const updated = await prisma.packageBooking.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { package: true, user: true }
    });

    // If status is Confirmed, generate receipt and send email
    if (status === 'Confirmed') {
        try {
            const doc = generateReceiptDoc(updated);
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);
                await sendBookingConfirmationEmail(updated, pdfBuffer);
            });
            doc.end();
        } catch (emailErr) {
            console.error("Failed to process confirmation email:", emailErr);
        }
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
