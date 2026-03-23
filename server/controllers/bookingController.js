const prisma = require('../db');
const sendEmail = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      packageId,
      passengers,
      locationFrom,
      travelDate,
      prefClass,
      contactName,
      contactEmail,
      contactPhone,
      passportNumber,
      dateOfBirth,
      nationality,
      notes,
    } = req.body;

    // Get user ID from auth middleware (assumes middleware adds user to req)
    const userId = req.user.id;

    // Validate that the package exists
    const travelPackage = await prisma.travelPackage.findUnique({ where: { id: parseInt(packageId) } });
    if (!travelPackage) {
      return res.status(404).json({ msg: 'Travel package not found' });
    }

    const newBooking = await prisma.packageBooking.create({
      data: {
      userId: parseInt(userId),
      packageId: parseInt(packageId),
      passengers: parseInt(passengers),
      locationFrom,
      travelDate,
      prefClass,
      contactName,
      contactEmail,
      contactPhone,
      passportNumber,
      dateOfBirth,
      nationality,
      notes,
      status: 'Pending', // Default status
      }
    });

    res.status(201).json(newBooking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get bookings for the current user
// @route   GET /api/bookings
// @access  Private
exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await prisma.packageBooking.findMany({
            where: { userId: req.user.id },
            include: { package: { select: { title: true, images: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all bookings (for admin)
// @route   GET /api/bookings/all
// @access  Admin
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await prisma.packageBooking.findMany({
            include: {
                user: { select: { name: true, email: true } },
                package: { select: { title: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Update a booking's status
// @route   PUT /api/bookings/:id/status
// @access  Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Optional: Validate status to prevent arbitrary values
    const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid or missing status value' });
    }

    const booking = await prisma.packageBooking.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        user: { select: { id: true, name: true, email: true, emailSubscriptions: true } },
        package: { select: { title: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const oldStatus = booking.status;
    const updatedBooking = await prisma.packageBooking.update({
        where: { id: parseInt(id, 10) },
        data: { status },
        include: { user: true, package: true } // re-include for email
    });

    // If status changed to 'Confirmed', send an email notification
    if (status === 'Confirmed' && oldStatus !== 'Confirmed' && updatedBooking.user?.emailSubscriptions) {
      try {
        // Generate a long-lived token specifically for unsubscribing
        const unsubscribeToken = jwt.sign({ id: updatedBooking.user.id }, process.env.JWT_SECRET, { expiresIn: '365d' });
        // Ensure you have API_BASE_URL in your .env file (e.g., http://localhost:5001)
        const unsubscribeUrl = `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/users/unsubscribe/${unsubscribeToken}`;

        // Create PDF Itinerary
        const doc = new PDFDocument({
            bufferPages: true,
            userPassword: updatedBooking.passportNumber,
            ownerPassword: process.env.PDF_OWNER_PASSWORD || 'admin'
        });

        const logoPath = path.join(__dirname, '../public/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 50 });
        }

        doc.fontSize(20).text('Booking Confirmation', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Dear ${updatedBooking.user.name},`);
        doc.moveDown();
        doc.text(`Thank you for booking with NuurPath Travels. Here are your trip details:`);
        doc.moveDown();

        // Table Layout
        const startX = 50;
        let currentY = doc.y + 15;
        const col1X = 50;
        const col2X = 200;
        const rowHeight = 30;

        doc.fontSize(14).text('Itinerary Details');
        
        // Header Row
        doc.rect(startX, currentY, 500, rowHeight).fillColor('#f0f0f0').fill();
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
        doc.text('Item', col1X + 10, currentY + 10);
        doc.text('Details', col2X + 10, currentY + 10);
        
        currentY += rowHeight;
        doc.font('Helvetica');

        const tableRows = [
            { label: 'Package', value: updatedBooking.package.title },
            { label: 'Destination', value: updatedBooking.package.destination },
            { label: 'Duration', value: updatedBooking.package.duration },
            { label: 'Travel Date', value: new Date(updatedBooking.travelDate).toDateString() },
            { label: 'Passengers', value: updatedBooking.passengers },
            { label: 'Status', value: updatedBooking.status }
        ];

        tableRows.forEach((row, i) => {
            // Background for alternate rows
            if (i % 2 !== 0) {
                doc.rect(startX, currentY, 500, rowHeight).fillColor('#f9f9f9').fill();
            }
            
            doc.fillColor('#000000');
            doc.text(row.label, col1X + 10, currentY + 10);
            doc.text(String(row.value), col2X + 10, currentY + 10);
            
            // Bottom border
            doc.moveTo(startX, currentY + rowHeight)
               .lineTo(startX + 500, currentY + rowHeight)
               .strokeColor('#e0e0e0')
               .stroke();
            
            currentY += rowHeight;
        });

        // Add Footer with Page Numbers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fillColor('#444444')
               .fontSize(10)
               .text(
                   `Page ${i + 1} of ${range.count}`,
                   50,
                   doc.page.height - 50,
                   { align: 'center' }
               );
        }

        doc.end();

        const message = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
                    .header h1 { color: #0B1C3E; margin: 0; }
                    .content { padding: 20px 0; color: #333; line-height: 1.6; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #0B1C3E; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #aaa; }
                    .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>NuurPath Travels</h1>
                    </div>
                    <div class="content">
                        <h2>Booking Confirmed!</h2>
                        <p>Dear ${updatedBooking.user.name},</p>
                        <p>We are thrilled to confirm your booking. Get ready for an unforgettable journey!</p>
                        <div class="details">
                            <p><strong>Package:</strong> ${updatedBooking.package.title}</p>
                            <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">Confirmed</span></p>
                        </div>
                        <p>You can view your full itinerary and details by logging into your account.</p>
                        <div style="text-align: center;">
                            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/bookings" class="button">View Booking</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} NuurPath Travels. All rights reserved.</p>
                        <p><a href="${unsubscribeUrl}" style="color: #aaa;">Unsubscribe from emails</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await sendEmail({
            to: updatedBooking.user.email,
            subject: 'Your NuurPath Travels Booking is Confirmed!',
            html: message,
            attachments: [
                {
                    filename: 'Itinerary.pdf',
                    content: doc,
                    contentType: 'application/pdf'
                }
            ]
        });
      } catch (emailError) {
        console.error('Email could not be sent:', emailError);
        // Don't fail the whole request if email fails, just log it for debugging.
      }
    }

    res.json(updatedBooking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};