const mongoose = require('mongoose');

const FlightBookingSchema = new mongoose.Schema({
    // User who made the booking
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Array of passenger details for the flight booking
    passengers: [{
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date, required: true },
        passportNumber: { type: String, trim: true, sparse: true }, // Optional, for international flights
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, trim: true },
    }],
    // Array of flight segments for multi-leg journeys
    flights: [{
        airline: { type: String, required: true, trim: true },
        flightNumber: { type: String, required: true, trim: true },
        departureAirport: { type: String, required: true, trim: true }, // e.g., "JFK", "DAR"
        arrivalAirport: { type: String, required: true, trim: true },   // e.g., "LAX", "DXB"
        departureTime: { type: Date, required: true },
        arrivalTime: { type: Date, required: true },
        cabinClass: {
            type: String,
            enum: ['economy', 'premium_economy', 'business', 'first'],
            default: 'economy',
        },
        // Optional: booking reference specific to this flight segment if it differs from main bookingRef
        segmentBookingRef: { type: String, trim: true, sparse: true },
    }],
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        default: 'USD',
        trim: true,
    },
    // Main Passenger Name Record (PNR) or booking reference from the airline/GDS
    bookingReference: {
        type: String,
        required: true,
        unique: true, // This should be unique for each booking
        trim: true,
    },
    // Payment status for the flight booking
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'unpaid', 'refunded', 'failed'],
        default: 'unpaid',
    },
    // Transaction ID from the payment gateway
    transactionId: {
        type: String,
        trim: true,
        sparse: true, // Allow multiple documents to have null/undefined
    },
    // Internal status of the flight booking
    bookingStatus: {
        type: String,
        enum: ['confirmed', 'pending', 'cancelled', 'ticketed', 'rescheduled'],
        default: 'pending',
    },
    bookedAt: {
        type: Date,
        default: Date.now,
    },
    // Optional: Contact details for the person making the booking, if different from passenger or user
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
});

module.exports = mongoose.model('FlightBooking', FlightBookingSchema);
