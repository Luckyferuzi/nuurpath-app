const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');
const { notifyAdmins } = require('../utils/adminNotifier');

// @route   POST api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { contactName, contactEmail, contactPhone, travelDate, passengers, packageId, locationFrom, passportNumber, passportExpiryDate, dateOfBirth, specialRequests, nationality, passportCopy } = req.body;

        if (!packageId || !travelDate) {
            return res.status(400).json({ msg: 'Package and travel date are required' });
        }

        const userId = parseInt(req.user.id);
        if (isNaN(userId)) {
            return res.status(400).json({ msg: 'Invalid User ID' });
        }

        // Validate Dates
        const travelDateObj = new Date(travelDate);
        if (isNaN(travelDateObj.getTime())) {
            return res.status(400).json({ msg: 'Invalid Travel Date' });
        }

        let passportExpiry = null;
        if (passportExpiryDate) {
            passportExpiry = new Date(passportExpiryDate);
            const minExpiry = new Date(travelDateObj);
            minExpiry.setMonth(minExpiry.getMonth() + 6);
            if (passportExpiry < minExpiry) {
                return res.status(400).json({ msg: 'Passport must be valid for at least 6 months after travel date' });
            }
        }

        let dob = new Date();
        if (dateOfBirth) {
            const parsedDob = new Date(dateOfBirth);
            if (!isNaN(parsedDob.getTime())) dob = parsedDob;
        }

        const booking = await prisma.packageBooking.create({
            data: {
                userId: userId,
                packageId: parseInt(packageId),
                contactName,
                contactEmail,
                contactPhone: contactPhone || '',
                locationFrom: locationFrom || 'Not Specified',
                passportNumber: passportNumber || 'N/A',
                passportExpiryDate: passportExpiry,
                passportCopy: passportCopy || null,
                dateOfBirth: dob,
                nationality: nationality || 'Not Specified',
                specialRequests: specialRequests || '',
                travelDate: travelDateObj,
                passengers: parseInt(passengers),
                status: 'Pending'
            }
        });

        // Create notification for the user
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

            // Notify Admins about the new booking
            await notifyAdmins(req.app, {
                title: 'New Package Booking',
                message: `New booking #${booking.id} received from ${contactName} for package #${packageId}`,
                type: 'NEW_BOOKING',
                bookingId: booking.id
            });

            // Send Email Notification
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
            
            await sendEmail(contactEmail, `Booking Received - #${booking.id}`, emailHtml);
        } catch (notifErr) {
            console.error("Notification/Email failed:", notifErr);
        }

        res.json(booking);
    } catch (err) {
        console.error('Booking error details:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET api/bookings
// @desc    Get all bookings for current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const bookings = await prisma.packageBooking.findMany({
            where: { userId: parseInt(req.user.id) },
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
        const id = parseInt(req.params.id);
        const booking = await prisma.packageBooking.findUnique({
            where: { id }
        });

        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        if (booking.userId !== parseInt(req.user.id)) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updatedBooking = await prisma.packageBooking.update({
            where: { id },
            data: { status: 'Cancelled' }
        });

        await prisma.notification.create({
            data: {
                userId: parseInt(req.user.id),
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
        // Placeholder for receipt generation logic
        // In a real implementation, you would generate a PDF here
        res.status(200).send("Receipt generation not implemented yet.");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;