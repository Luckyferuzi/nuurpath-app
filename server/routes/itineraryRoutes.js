const express = require('express');
const router = express.Router();
const prisma = require('../db');
const PDFDocument = require('pdfkit');

// @route   GET api/itinerary/:packageId/pdf
// @desc    Generate and download itinerary PDF
// @access  Public
router.get('/:packageId/pdf', async (req, res) => {
    try {
        const packageId = Number.parseInt(req.params.packageId, 10);
        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({ msg: 'Invalid package id' });
        }

        const pkg = await prisma.package.findUnique({
            where: { id: packageId }
        });

        if (!pkg) {
            return res.status(404).json({ msg: 'Package not found' });
        }

        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${pkg.title.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(24).text(pkg.title, { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).text(`Destination: ${pkg.destination}`);
        doc.text(`Duration: ${pkg.duration}`);
        doc.text(`Type: ${pkg.type}`);
        doc.moveDown();

        if (Array.isArray(pkg.journeyStops) && pkg.journeyStops.length > 0) {
            doc.fontSize(18).text('Journey Route', { underline: true });
            doc.moveDown(0.5);

            pkg.journeyStops.forEach((stop, index) => {
                doc.fontSize(13).font('Helvetica-Bold').text(`Stop ${index + 1}: ${stop.city}`);
                doc.fontSize(12).font('Helvetica');
                if (stop.stayLabel) {
                    doc.text(`Stay: ${stop.stayLabel}`);
                }
                if (stop.accommodation) {
                    doc.text(`Accommodation: ${stop.accommodation}`);
                }
                if (stop.notes) {
                    doc.text(stop.notes);
                }
                doc.moveDown();
            });
        }

        // Itinerary Content
        if (pkg.itinerary) {
            doc.fontSize(18).text('Itinerary', { underline: true });
            doc.moveDown();

            try {
                const itineraryData = JSON.parse(pkg.itinerary);
                if (Array.isArray(itineraryData)) {
                    itineraryData.forEach(day => {
                        doc.fontSize(14).font('Helvetica-Bold').text(`Day ${day.day}: ${day.title}`);
                        doc.fontSize(12).font('Helvetica').text(day.description);
                        doc.moveDown();
                    });
                } else {
                    doc.fontSize(12).text(pkg.itinerary);
                }
            } catch (e) {
                doc.fontSize(12).text(pkg.itinerary);
            }
        }

        doc.end();

    } catch (err) {
        console.error('Error generating itinerary PDF:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
