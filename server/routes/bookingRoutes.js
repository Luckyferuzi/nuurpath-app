const express = require('express');
const router = express.Router();
const fs = require('fs');
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { sendEmail } = require('../utils/emailService');
const { notifyAdmins } = require('../utils/adminNotifier');
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

// @route   POST api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { contactName, contactEmail, contactPhone, travelDate, passengers, packageId, locationFrom, passportNumber, passportExpiryDate, dateOfBirth, specialRequests, nationality, passportCopy } = req.body;

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

        if (!isNonEmptyString(locationFrom)) {
            return sendValidationError(res, 'Departure city is required.');
        }

        if (!isNonEmptyString(passportNumber)) {
            return sendValidationError(res, 'Passport number is required.');
        }

        if (!isNonEmptyString(nationality)) {
            return sendValidationError(res, 'Nationality is required.');
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

        if (!isValidDate(travelDate)) {
            return sendValidationError(res, 'Invalid travel date.');
        }

        if (!isValidDate(dateOfBirth)) {
            return sendValidationError(res, 'Invalid date of birth.');
        }

        const userId = toPositiveInteger(req.user.id);
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

        const travelDateObj = new Date(travelDate);
        const dob = new Date(dateOfBirth);
        const passportExpiry = parseOptionalDate(passportExpiryDate);

        if (passportExpiryDate && passportExpiry === null) {
            return sendValidationError(res, 'Invalid passport expiry date.');
        }

        if (passportExpiry) {
            const minExpiry = new Date(travelDateObj);
            minExpiry.setMonth(minExpiry.getMonth() + 6);
            if (passportExpiry < minExpiry) {
                return sendValidationError(res, 'Passport must be valid for at least 6 months after travel date.');
            }
        }

        const booking = await prisma.packageBooking.create({
            data: {
                userId,
                packageId: normalizedPackageId,
                contactName: toTrimmedString(contactName),
                contactEmail: toTrimmedString(contactEmail),
                contactPhone: toTrimmedString(contactPhone),
                locationFrom: toTrimmedString(locationFrom),
                passportNumber: toTrimmedString(passportNumber),
                passportExpiryDate: passportExpiry,
                passportCopy: normalizedPassportCopy,
                dateOfBirth: dob,
                nationality: toTrimmedString(nationality),
                specialRequests: typeof specialRequests === 'string' ? specialRequests.trim() : '',
                travelDate: travelDateObj,
                passengers: passengerCount,
                status: 'Pending'
            }
        });

        try {
            await prisma.notification.create({
                data: {
                    userId: userId,
                    title: 'Booking Received',
                    message: `Your booking for package #${packageId} has been received. Status: Pending.`,
                    type: 'BOOKING_UPDATE',
                    bookingId: booking.id
                }
            });
        } catch (notificationError) {
            console.error('Failed to create booking notification:', notificationError);
        }

        await notifyAdmins(req.app, {
            title: 'New Package Booking',
            message: `New booking #${booking.id} received from ${contactName} for package #${packageId}`,
            type: 'NEW_BOOKING',
            bookingId: booking.id
        });

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #0B1C3E;">Booking Confirmation</h2>
                <p>Dear <strong>${contactName}</strong>,</p>
                <p>Thank you for choosing NuurPath Travels. We have received your booking request.</p>
                
                <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                    <p><strong>Package ID:</strong> #${packageId}</p>
                    <p><strong>Travel Date:</strong> ${new Date(travelDate).toDateString()}</p>
                    <p><strong>Passengers:</strong> ${passengers}</p>
                    <p><strong>Status:</strong> <span style="color: orange;">Pending</span></p>
                </div>

                <p>Our team will review your details and contact you shortly regarding the next steps.</p>
                <br/>
                <p>Best Regards,<br/><strong>NuurPath Travels Team</strong></p>
            </div>
        `;

        try {
            await sendEmail({
                to: contactEmail,
                subject: `Booking Received - #${booking.id}`,
                html: emailHtml,
            });
        } catch (emailError) {
            console.error('Failed to send booking confirmation email:', emailError);
        }

        res.json(booking);
    } catch (err) {
        console.error('Booking error details:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET api/bookings/documents/:filename
// @desc    Download a protected booking document
// @access  Private (Admin/Manager)
router.get('/documents/:filename', auth, adminAuth, async (req, res) => {
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
// @desc    Get all bookings for current user
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
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/bookings/:id/cancel
// @desc    Cancel a booking
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
            return res.status(404).json({ msg: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updatedBooking = await prisma.packageBooking.update({
            where: { id },
            data: { status: 'Cancelled' }
        });

        await prisma.notification.create({
            data: {
                userId,
                title: 'Booking Cancellation',
                message: `Booking #${id} has been cancelled.`,
                type: 'BOOKING_CANCELLED',
                bookingId: id
            }
        });

        res.json(updatedBooking);
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
