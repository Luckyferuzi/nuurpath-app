const PDFDocument = require('pdfkit');

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
    
    doc.text(`Customer Name: ${booking.contactName}`);
    doc.text(`Email: ${booking.contactEmail}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Package Details', { underline: true });
    doc.fontSize(12).text(`Package: ${booking.package.title}`);
    doc.text(`Travel Date: ${new Date(booking.travelDate).toLocaleDateString()}`);
    doc.text(`Passengers: ${booking.passengers}`);
    doc.moveDown();
    
    doc.fontSize(14).text(`Total Amount: $${(Number(booking.package.price) * booking.passengers).toLocaleString()}`, { align: 'right' });
    
    return doc;
};

module.exports = { generateReceiptDoc };