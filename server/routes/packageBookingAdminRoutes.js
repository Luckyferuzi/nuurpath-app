const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { generateReceiptDoc } = require('../utils/receiptGenerator');
const { sendBookingConfirmationEmail } = require('../utils/emailService');
const {
  isNonEmptyString,
  isValidDate,
  isValidEmail,
  normalizeStatus,
  sendInvalidId,
  sendValidationError,
  toPositiveInteger,
  toTrimmedString,
} = require('../utils/validation');

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled'];

// Note: These routes should be protected by admin middleware in a real application.

// @route   GET /api/package-bookings
// @desc    Get ALL Package Bookings (for Admin)
// @access  Private (Admin/Manager)
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

// @route   POST /api/package-bookings
// @desc    Create a booking (Admin)
// @access  Private (Admin)
router.post('/', auth, adminAuth, async (req, res) => {
    try {
        const { packageId, contactName, contactEmail, contactPhone, travelDate, passengers, status } = req.body;
        const normalizedPackageId = toPositiveInteger(packageId);
        if (normalizedPackageId === null) {
            return sendValidationError(res, 'Package id must be a positive integer.');
        }

        if (!isNonEmptyString(contactName)) {
            return sendValidationError(res, 'Contact name is required.');
        }

        if (!isValidEmail(contactEmail)) {
            return sendValidationError(res, 'A valid contact email is required.');
        }

        if (!isValidDate(travelDate)) {
            return sendValidationError(res, 'A valid travel date is required.');
        }

        const passengerCount = toPositiveInteger(passengers);
        if (passengerCount === null) {
            return sendValidationError(res, 'Passengers must be a positive integer.');
        }

        const normalizedStatus = status === undefined || status === null || status === ''
            ? 'Pending'
            : normalizeStatus(status, BOOKING_STATUSES);

        if (!normalizedStatus) {
            return sendValidationError(res, 'Status must be Pending, Confirmed, or Cancelled.');
        }

        // Try to find user by email to link, otherwise link to admin (req.user.id)
        // In a real app, you might create a new user here.
        let userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const selectedPackage = await prisma.package.findUnique({
            where: { id: normalizedPackageId },
            select: { id: true },
        });
        if (!selectedPackage) {
            return sendValidationError(res, 'Selected package does not exist.');
        }

        const existingUser = await prisma.user.findUnique({ where: { email: contactEmail } });
        if (existingUser) {
            userId = existingUser.id;
        }

        const newBooking = await prisma.packageBooking.create({
            data: {
                userId,
                packageId: normalizedPackageId,
                contactName: toTrimmedString(contactName),
                contactEmail: toTrimmedString(contactEmail),
                contactPhone: typeof contactPhone === 'string' ? contactPhone.trim() : '',
                travelDate: new Date(travelDate),
                passengers: passengerCount,
                status: normalizedStatus
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
// @access  Private (Admin/Manager)
router.put('/:id', auth, adminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const id = toPositiveInteger(req.params.id);
    if (id === null) {
      return sendInvalidId(res);
    }

    const normalizedStatus = normalizeStatus(status, BOOKING_STATUSES);
    if (!normalizedStatus) {
      return sendValidationError(res, 'Status must be Pending, Confirmed, or Cancelled.');
    }

    const updated = await prisma.packageBooking.update({
      where: { id },
      data: { status: normalizedStatus },
      include: { package: true, user: true }
    });

    // If status is Confirmed, generate receipt and send email
    if (normalizedStatus === 'Confirmed') {
        try {
            const doc = generateReceiptDoc(updated);
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                try {
                    const pdfBuffer = Buffer.concat(buffers);
                    await sendBookingConfirmationEmail(updated, pdfBuffer);
                } catch (emailErr) {
                    console.error('Failed to send booking confirmation email:', emailErr);
                }
            });
            doc.on('error', (pdfError) => {
                console.error('Failed to generate booking confirmation document:', pdfError);
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

// @route   DELETE /api/package-bookings/:id
// @desc    Delete a package booking (for Admin)
// @access  Private (Admin/Manager)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const id = toPositiveInteger(req.params.id);
    if (id === null) {
      return sendInvalidId(res);
    }

    await prisma.packageBooking.delete({
      where: { id }
    });

    res.json({ msg: 'Booking deleted successfully' });
  } catch (err) {
    console.error("Error deleting package booking:", err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
