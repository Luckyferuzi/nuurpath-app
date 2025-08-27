const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TravelPackage',
        required: true,
    },
    bookingDate: {
        type: Date,
        default: Date.now,
    },
    travelDate: { // The date the user wants to travel
        type: Date,
        required: true,
    },
    numberOfTravelers: {
        type: Number,
        required: true,
        min: 1,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    // NEW FIELD: Payment Status
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'unpaid', 'refunded', 'failed'], // Possible payment states
        default: 'unpaid', // Default to unpaid until payment is processed
    },
    // NEW FIELD: Transaction ID
    transactionId: {
        type: String,
        trim: true, // Remove whitespace
        sparse: true, // Allow multiple documents to have null/undefined values for this field
        // unique: true // If every transaction ID must be unique (recommended for actual payment integration)
    },
    // Add other fields like contact info for non-registered users or additional details
});

module.exports = mongoose.model('Booking', BookingSchema);
