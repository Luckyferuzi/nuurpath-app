const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrManager } = require('../middleware/adminAuth');
const { generateReceiptDoc } = require('../utils/receiptGenerator');
const { sendBookingConfirmationEmail } = require('../utils/emailService');
const {
  isNonEmptyString,
  isValidEmail,
  parseOptionalDate,
  sendInvalidId,
  sendValidationError,
  toPositiveInteger,
  toTrimmedString,
} = require('../utils/validation');
const {
  normalizeOperationalStatus,
  shouldSetLastContactedAt,
} = require('../utils/operationalPipeline');
const {
  extractSafeFilenameFromReference,
  toProtectedBookingDocumentUrl,
} = require('../utils/upload');
const {
  STORED_FILE_ROUTE_PREFIXES,
  buildProtectedBookingStoredFileUrl,
  extractStoredFileIdFromReference,
} = require('../utils/storedFiles');

function normalizePackageBookingDocumentReference(value) {
  const storedFileId = extractStoredFileIdFromReference(
    value,
    [STORED_FILE_ROUTE_PREFIXES.BOOKING_DOCUMENT]
  );

  if (storedFileId !== null) {
    return buildProtectedBookingStoredFileUrl(storedFileId);
  }

  const legacyFilename = extractSafeFilenameFromReference(value);
  return legacyFilename ? toProtectedBookingDocumentUrl(legacyFilename) : null;
}

function buildPackageBookingMissingDetails(booking) {
  const missing = [];

  if (!booking.locationFrom) {
    missing.push('departure city');
  }

  if (!booking.travelDate) {
    missing.push('preferred travel date');
  }

  if (!booking.passportNumber) {
    missing.push('passport number');
  }

  if (!booking.passportExpiryDate) {
    missing.push('passport expiry date');
  }

  if (!booking.dateOfBirth) {
    missing.push('date of birth');
  }

  if (!booking.nationality) {
    missing.push('nationality');
  }

  if (!booking.passportCopy) {
    missing.push('passport copy');
  }

  return missing;
}

function buildPackageBookingNextAction(booking) {
  const status = normalizeOperationalStatus(booking.status) || 'New';
  const hasPassportPack = Boolean(
    booking.passportNumber &&
    booking.passportExpiryDate &&
    booking.dateOfBirth &&
    booking.nationality &&
    booking.passportCopy
  );

  if (status === 'Cancelled' || status === 'Lost') {
    return 'No follow-up is needed unless the traveler asks to reopen the request.';
  }

  if (status === 'Completed') {
    return 'Travel is marked complete. A final thank-you or testimonial follow-up can happen separately.';
  }

  if (status === 'Confirmed Offline') {
    return 'Keep the traveler updated on final travel coordination and any remaining logistics.';
  }

  if (status === 'Quoted') {
    return 'Follow up on the quote, confirm customer readiness, and note any agreed next step.';
  }

  if (status === 'Docs Requested') {
    return 'Wait for the remaining passport items and record exactly what is still missing in team notes.';
  }

  if (status === 'Docs Received') {
    return hasPassportPack
      ? 'Review the passport details against the travel plan and move the request toward quoting or confirmation.'
      : 'Review the submitted passport items and confirm what is still missing before the next step.';
  }

  if (status === 'Contacted' || status === 'WhatsApp Follow-up') {
    return booking.passportCopy
      ? 'Continue the WhatsApp conversation and move the traveler toward quote or confirmation.'
      : 'Continue on WhatsApp and ask for the passport copy before moving further.';
  }

  if (status === 'Qualified') {
    return hasPassportPack
      ? 'The core travel and passport details are available. Prepare the quote or confirmation path.'
      : 'Confirm the traveler details and collect the remaining passport information.';
  }

  if (hasPassportPack) {
    return 'Review the submitted passport details and continue the next travel step with the customer.';
  }

  return 'Review the request, greet the traveler on WhatsApp, and collect the missing passport details.';
}

function serializePackageBookingForStaff(booking) {
  if (!booking || typeof booking !== 'object') {
    return booking;
  }

  const passportCopyUrl = normalizePackageBookingDocumentReference(booking.passportCopy);
  const missingInformation = buildPackageBookingMissingDetails({
    ...booking,
    passportCopy: passportCopyUrl,
  });

  return {
    ...booking,
    requestId: booking.id,
    packageTitle: booking.package?.title || null,
    customerNotes: booking.specialRequests || booking.notes || null,
    departureCity: booking.locationFrom || null,
    customerType: booking.userId ? 'Account Holder' : 'Guest',
    passportCopy: passportCopyUrl,
    passportCopyUrl,
    passportCopyAvailable: Boolean(passportCopyUrl),
    hasPassportDetails: Boolean(
      booking.passportNumber ||
      booking.passportExpiryDate ||
      booking.dateOfBirth ||
      booking.nationality ||
      passportCopyUrl
    ),
    missingInformation,
    nextActionHint: buildPackageBookingNextAction({
      ...booking,
      passportCopy: passportCopyUrl,
    }),
    status: normalizeOperationalStatus(booking.status) || 'New',
  };
}

async function sendOfflineConfirmation(booking) {
  try {
    const doc = generateReceiptDoc(booking);
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        await sendBookingConfirmationEmail(booking, pdfBuffer);
      } catch (emailErr) {
        console.error('Failed to send booking confirmation email:', emailErr);
      }
    });
    doc.on('error', (pdfError) => {
      console.error('Failed to generate booking confirmation document:', pdfError);
    });
    doc.end();
  } catch (error) {
    console.error('Failed to process offline confirmation email:', error);
  }
}

// @route   GET /api/package-bookings
// @desc    Get all package requests (for Admin/Manager)
// @access  Private (Admin/Manager)
router.get('/', auth, requireAdminOrManager, async (req, res) => {
  try {
    const bookings = await prisma.packageBooking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        package: true,
      },
    });

    return res.json(bookings.map(serializePackageBookingForStaff));
  } catch (err) {
    console.error('Error fetching package bookings:', err);
    return res.status(500).send('Server Error');
  }
});

// @route   POST /api/package-bookings
// @desc    Create a package request manually from operations dashboard
// @access  Private (Admin/Manager)
router.post('/', auth, requireAdminOrManager, async (req, res) => {
  try {
    const {
      packageId,
      contactName,
      contactEmail,
      contactPhone,
      travelDate,
      passengers,
      status,
      adminNotes,
    } = req.body;

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

    if (!isNonEmptyString(contactPhone)) {
      return sendValidationError(res, 'A valid contact phone is required.');
    }

    const passengerCount = toPositiveInteger(passengers);
    if (passengerCount === null) {
      return sendValidationError(res, 'Passengers must be a positive integer.');
    }

    const parsedTravelDate = parseOptionalDate(travelDate);
    if (travelDate !== undefined && travelDate !== null && travelDate !== '' && parsedTravelDate === null) {
      return sendValidationError(res, 'A valid travel date is required.');
    }

    const normalizedStatus = status === undefined || status === null || status === ''
      ? 'New'
      : normalizeOperationalStatus(status);

    if (!normalizedStatus) {
      return sendValidationError(res, 'Status must match the operational pipeline.');
    }

    const selectedPackage = await prisma.package.findUnique({
      where: { id: normalizedPackageId },
      select: { id: true },
    });
    if (!selectedPackage) {
      return sendValidationError(res, 'Selected package does not exist.');
    }

    let userId = null;
    const existingUser = await prisma.user.findUnique({ where: { email: toTrimmedString(contactEmail) } });
    if (existingUser) {
      userId = existingUser.id;
    }

    const newBooking = await prisma.packageBooking.create({
      data: {
        userId,
        packageId: normalizedPackageId,
        contactName: toTrimmedString(contactName),
        contactEmail: toTrimmedString(contactEmail),
        contactPhone: toTrimmedString(contactPhone),
        travelDate: parsedTravelDate,
        passengers: passengerCount,
        status: normalizedStatus,
        adminNotes: isNonEmptyString(adminNotes) ? toTrimmedString(adminNotes) : null,
        lastContactedAt: shouldSetLastContactedAt(normalizedStatus) ? new Date() : null,
      },
      include: { user: true, package: true },
    });

    if (normalizedStatus === 'Confirmed Offline') {
      await sendOfflineConfirmation(newBooking);
    }

    return res.status(201).json(serializePackageBookingForStaff(newBooking));
  } catch (err) {
    console.error('Error creating package request:', err);
    return res.status(500).send('Server Error');
  }
});

// @route   PUT /api/package-bookings/:id
// @desc    Update package request pipeline details
// @access  Private (Admin/Manager)
router.put('/:id', auth, requireAdminOrManager, async (req, res) => {
  try {
    const id = toPositiveInteger(req.params.id);
    if (id === null) {
      return sendInvalidId(res);
    }

    const {
      contactName,
      contactEmail,
      contactPhone,
      packageId,
      travelDate,
      passengers,
      status,
      adminNotes,
    } = req.body;

    const updateData = {};

    if (contactName !== undefined) {
      if (!isNonEmptyString(contactName)) {
        return sendValidationError(res, 'Contact name is required.');
      }

      updateData.contactName = toTrimmedString(contactName);
    }

    if (contactEmail !== undefined) {
      if (!isValidEmail(contactEmail)) {
        return sendValidationError(res, 'A valid contact email is required.');
      }

      updateData.contactEmail = toTrimmedString(contactEmail);
    }

    if (contactPhone !== undefined) {
      if (!isNonEmptyString(contactPhone)) {
        return sendValidationError(res, 'A valid contact phone is required.');
      }

      updateData.contactPhone = toTrimmedString(contactPhone);
    }

    if (packageId !== undefined) {
      const normalizedPackageId = toPositiveInteger(packageId);
      if (normalizedPackageId === null) {
        return sendValidationError(res, 'Package id must be a positive integer.');
      }

      const selectedPackage = await prisma.package.findUnique({
        where: { id: normalizedPackageId },
        select: { id: true },
      });

      if (!selectedPackage) {
        return sendValidationError(res, 'Selected package does not exist.');
      }

      updateData.packageId = normalizedPackageId;
    }

    if (travelDate !== undefined) {
      const parsedTravelDate = parseOptionalDate(travelDate);
      if (travelDate !== null && travelDate !== '' && parsedTravelDate === null) {
        return sendValidationError(res, 'A valid travel date is required.');
      }

      updateData.travelDate = parsedTravelDate;
    }

    if (passengers !== undefined) {
      const passengerCount = toPositiveInteger(passengers);
      if (passengerCount === null) {
        return sendValidationError(res, 'Passengers must be a positive integer.');
      }

      updateData.passengers = passengerCount;
    }

    if (status !== undefined) {
      const normalizedStatus = normalizeOperationalStatus(status);
      if (!normalizedStatus) {
        return sendValidationError(res, 'Status must match the operational pipeline.');
      }

      updateData.status = normalizedStatus;
      if (shouldSetLastContactedAt(normalizedStatus)) {
        updateData.lastContactedAt = new Date();
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = isNonEmptyString(adminNotes) ? toTrimmedString(adminNotes) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return sendValidationError(res, 'No valid package request fields were provided for update.');
    }

    const updated = await prisma.packageBooking.update({
      where: { id },
      data: updateData,
      include: { package: true, user: true },
    });

    if (updateData.status === 'Confirmed Offline') {
      await sendOfflineConfirmation(updated);
    }

    return res.json(serializePackageBookingForStaff(updated));
  } catch (err) {
    console.error('Error updating package request:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Package request not found' });
    }

    return res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/package-bookings/:id
// @desc    Delete a package request
// @access  Private (Admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = toPositiveInteger(req.params.id);
    if (id === null) {
      return sendInvalidId(res);
    }

    await prisma.packageBooking.delete({
      where: { id },
    });

    return res.json({ msg: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Error deleting package booking:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Package request not found' });
    }

    return res.status(500).send('Server Error');
  }
});

module.exports = router;
