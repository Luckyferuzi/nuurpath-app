const PDFDocument = require('pdfkit');

function formatTravelDate(value) {
    if (!value) {
        return 'To be confirmed';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'To be confirmed';
    }

    return parsed.toLocaleDateString();
}

const generateReceiptDoc = (booking) => {
    const doc = new PDFDocument();

    // Header
    doc.fontSize(25).text('NuurPath Travels', { align: 'center' });
    doc.fontSize(12).text('Official Receipt', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    // Booking Details
    doc.fontSize(12).text(`Booking Reference: #${booking.id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    doc.text(`Customer Name: ${booking.contactName || booking.user?.name || 'Customer'}`);
    doc.text(`Email: ${booking.contactEmail || booking.user?.email || 'Not provided'}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Package Details', { underline: true });
    doc.fontSize(12).text(`Package: ${booking.package?.title || booking.packageTitleSnapshot || (booking.packageId ? `Package #${booking.packageId}` : 'Package request')}`);
    doc.text(`Travel Date: ${formatTravelDate(booking.travelDate)}`);
    doc.text(`Passengers: ${booking.passengers}`);
    doc.moveDown();
    
    doc.fontSize(14).text(`Total Amount: $${(Number(booking.package?.price || 0) * booking.passengers).toLocaleString()}`, { align: 'right' });
    
    return doc;
};

module.exports = { generateReceiptDoc };
