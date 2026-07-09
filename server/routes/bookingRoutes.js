const express = require('express');
const router = express.Router();
const fs = require('fs');
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdminOrManager } = require('../middleware/adminAuth');
const { packageRequestLimiter } = require('../middleware/rateLimitMiddleware');
const softAuth = require('../middleware/softAuth');
const { sendEmail } = require('../utils/emailService');
const { notifyAdmins } = require('../utils/adminNotifier');
const { normalizeOperationalStatus } = require('../utils/operationalPipeline');
const { escapeHtml } = require('../utils/security');
const {
    isNonEmptyString,
    isValidDate,
    isValidEmail,
    parseOptionalDate,
    sendInvalidId,
    sendValidationError,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const {
    extractSafeFilenameFromReference,
    resolvePrivateBookingDocumentPath,
    toProtectedBookingDocumentUrl,
} = require('../utils/upload');

function serializeCustomerPackageBooking(booking) {
    if (!booking || typeof booking !== 'object') {
        return booking;
    }

    const {
        adminNotes,
        lastContactedAt,
        ...safeBooking
    } = booking;

    return {
        ...safeBooking,
        requestId: booking.id,
        packageTitle: booking.package?.title || null,
        status: normalizeOperationalStatus(booking.status) || 'New',
        passportCopy: undefined,
    };
}

function formatRequestDate(value) {
    if (!value) {
        return 'To be confirmed';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'To be confirmed';
    }

    return parsed.toDateString();
}

// @route   POST api/bookings
// @desc    Create a new package request
// @access  Public/User
router.post('/', packageRequestLimiter, softAuth, async (req, res) => {
    try {
        const {
            contactName,
            contactEmail,
            contactPhone,
            travelDate,
            passengers,
            packageId,
            locationFrom,
            passportNumber,
            passportExpiryDate,
            dateOfBirth,
            specialRequests,
            notes,
            nationality,
            passportCopy,
        } = req.body;

        const normalizedPackageId = toPositiveInteger(packageId);
        if (normalizedPackageId === null) {
            return sendValidationError(res, 'Package id must be a positive integer.');
        }

        const passengerCount = toPositiveInteger(passengers);
        if (passengerCount === null) {
            return sendValidationError(res, 'Passengers must be a positive integer.');
        }

        if (!isNonEmptyString(contactName)) {
            return sendValidationError(res, 'Contact name is required.');
        }

        if (!isValidEmail(contactEmail)) {
            return sendValidationError(res, 'A valid contact email is required.');
        }

        if (!isNonEmptyString(contactPhone)) {
            return sendValidationError(res, 'Contact phone is required.');
        }

        if (travelDate !== undefined && travelDate !== null && travelDate !== '' && !isValidDate(travelDate)) {
            return sendValidationError(res, 'A valid preferred travel date is required.');
        }

        const parsedDateOfBirth = parseOptionalDate(dateOfBirth);
        if (dateOfBirth && parsedDateOfBirth === null) {
            return sendValidationError(res, 'Invalid date of birth.');
        }

        const parsedTravelDate = parseOptionalDate(travelDate);
        const passportExpiry = parseOptionalDate(passportExpiryDate);
        if (passportExpiryDate && passportExpiry === null) {
            return sendValidationError(res, 'Invalid passport expiry date.');
        }

        let normalizedPassportCopy = null;
        if (passportCopy !== undefined && passportCopy !== null && passportCopy !== '') {
            const passportFilename = extractSafeFilenameFromReference(passportCopy);
            if (!passportFilename) {
                return sendValidationError(res, 'Invalid passport document reference.');
            }

            const passportFilePath = resolvePrivateBookingDocumentPath(passportFilename);
            if (!passportFilePath || !fs.existsSync(passportFilePath)) {
                return sendValidationError(res, 'Uploaded passport document was not found.');
            }

            normalizedPassportCopy = toProtectedBookingDocumentUrl(passportFilename);
        }

        const selectedPackage = await prisma.package.findUnique({
            where: { id: normalizedPackageId },
            select: { id: true, title: true },
        });
        if (!selectedPackage) {
            return res.status(404).json({ msg: 'Selected package does not exist.' });
        }

        let userId = null;
        if (req.user && req.user.id) {
            userId = toPositiveInteger(req.user.id);
            if (userId === null) {
                return sendValidationError(res, 'Invalid user id.');
            }
        }

        if (passportExpiry && parsedTravelDate) {
            const minExpiry = new Date(parsedTravelDate);
            minExpiry.setMonth(minExpiry.getMonth() + 6);
            if (passportExpiry < minExpiry) {
                return sendValidationError(res, 'Passport must be valid for at least 6 months after travel date.');
            }
        }

        const customerMessage = isNonEmptyString(specialRequests)
            ? toTrimmedString(specialRequests)
            : (isNonEmptyString(notes) ? toTrimmedString(notes) : null);
        const normalizedNotes = isNonEmptyString(notes) ? toTrimmedString(notes) : null;

        const booking = await prisma.packageBooking.create({
            data: {
                userId,
                packageId: normalizedPackageId,
                contactName: toTrimmedString(contactName),
                contactEmail: toTrimmedString(contactEmail),
                contactPhone: toTrimmedString(contactPhone),
                locationFrom: isNonEmptyString(locationFrom) ? toTrimmedString(locationFrom) : null,
                passportNumber: isNonEmptyString(passportNumber) ? toTrimmedString(passportNumber) : null,
                passportExpiryDate: passportExpiry,
                passportCopy: normalizedPassportCopy,
                dateOfBirth: parsedDateOfBirth,
                nationality: isNonEmptyString(nationality) ? toTrimmedString(nationality) : null,
                specialRequests: customerMessage,
                notes: normalizedNotes,
                travelDate: parsedTravelDate,
                passengers: passengerCount,
                status: 'Pending'
            },
            include: {
                package: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (userId !== null) {
            try {
                await prisma.notification.create({
                    data: {
                        userId,
                        title: 'Package Request Received',
                        message: `Your request #${booking.id} for ${selectedPackage.title} has been received. Status: Pending.`,
                        type: 'BOOKING_UPDATE',
                        bookingId: booking.id,
                    },
                });
            } catch (notificationError) {
                console.error('Failed to create package request notification:', notificationError);
            }
        }

        await notifyAdmins(req.app, {
            title: 'New Package Request',
            message: `New package request #${booking.id} received from ${booking.contactName} for ${selectedPackage.title}`,
            type: 'NEW_BOOKING',
            bookingId: booking.id,
        });

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #0B1C3E;">Package Request Received</h2>
                <p>Dear <strong>${escapeHtml(booking.contactName)}</strong>,</p>
                <p>Thank you for choosing NuurPath Travels. We have received your package request and our team will review it shortly.</p>
                
                <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Request ID:</strong> #${escapeHtml(booking.id)}</p>
                    <p><strong>Package:</strong> ${escapeHtml(selectedPackage.title)}</p>
                    <p><strong>Preferred Travel Date:</strong> ${escapeHtml(formatRequestDate(booking.travelDate))}</p>
                    <p><strong>Travelers:</strong> ${escapeHtml(booking.passengers)}</p>
                    <p><strong>Status:</strong> <span style="color: orange;">Pending</span></p>
                </div>

                <p>Our team will continue with you on WhatsApp using the contact number you provided.</p>
                <br/>
                <p>Best Regards,<br/><strong>NuurPath Travels Team</strong></p>
            </div>
        `;

        try {
            await sendEmail({
                to: booking.contactEmail,
                subject: `Package Request Received - #${booking.id}`,
                html: emailHtml,
                text: [
                    `Dear ${booking.contactName},`,
                    'Thank you for choosing NuurPath Travels. We have received your package request and our team will review it shortly.',
                    `Request ID: #${booking.id}`,
                    `Package: ${selectedPackage.title}`,
                    `Preferred Travel Date: ${formatRequestDate(booking.travelDate)}`,
                    `Travelers: ${booking.passengers}`,
                    'Status: Pending',
                    'Our team will continue with you on WhatsApp using the contact number you provided.',
                    'Best Regards,',
                    'NuurPath Travels Team',
                ].join('\n'),
            });
        } catch (emailError) {
            console.error('Failed to send package request confirmation email:', emailError);
        }

        return res.status(201).json({
            ...serializeCustomerPackageBooking(booking),
            packageTitle: selectedPackage.title,
        });
    } catch (err) {
        console.error('Package request error:', err);
        return res.status(500).json({ msg: 'Unable to submit your package request right now. Please try again.' });
    }
});

// @route   GET api/bookings/documents/:filename
// @desc    Download a protected booking document
// @access  Private (Admin/Manager)
router.get('/documents/:filename', auth, requireAdminOrManager, async (req, res) => {
    try {
        const documentPath = resolvePrivateBookingDocumentPath(req.params.filename);

        if (!documentPath || !fs.existsSync(documentPath)) {
            return res.status(404).json({ success: false, message: 'Document not found.' });
        }

        return res.sendFile(documentPath);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
});

// @route   GET api/bookings
// @desc    Get all package requests for current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const bookings = await prisma.packageBooking.findMany({
            where: { userId },
            include: { package: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings.map(serializeCustomerPackageBooking));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/bookings/:id/cancel
// @desc    Cancel a package request
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const userId = toPositiveInteger(req.user.id);
        if (userId === null) {
            return sendValidationError(res, 'Invalid user id.');
        }

        const booking = await prisma.packageBooking.findUnique({
            where: { id }
        });

        if (!booking) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ msg: 'User not authorized' });
        }

        const updatedBooking = await prisma.packageBooking.update({
            where: { id },
            data: { status: 'Cancelled' }
        });

        await prisma.notification.create({
            data: {
                userId,
                title: 'Package Request Cancelled',
                message: `Request #${id} has been cancelled.`,
                type: 'BOOKING_CANCELLED',
                bookingId: id
            }
        });

        res.json(serializeCustomerPackageBooking(updatedBooking));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/bookings/:id/receipt
// @desc    Get booking receipt
// @access  Private
router.get('/:id/receipt', auth, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        // Placeholder for receipt generation logic
        // In a real implementation, you would generate a PDF here
        res.status(200).send("Receipt generation not implemented yet.");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
