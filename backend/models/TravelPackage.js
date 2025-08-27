const mongoose = require('mongoose');

const TravelPackageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    duration: { // e.g., "7 Days / 6 Nights"
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    itinerary: [
        {
            day: { type: Number, required: true },
            activity: { type: String, required: true },
        },
    ],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    images: [{ type: String }], // URLs to images
    availability: {
        startDate: { type: Date },
        endDate: { type: Date },
        // Or a more complex system for multiple departure dates
    },
    // UPDATED FIELD: Type of travel with new categories
    type: {
        type: String,
        enum: [
            'adventure', 'relaxation', 'cultural', 'family', 'romantic', 'wildlife', 'city_break', 'beach',
            'hajj', 'umrah', 'flight_only', 'leisure' // Added new categories here
        ],
        default: 'leisure', // Changed default to 'leisure' as a more general category
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TravelPackage', TravelPackageSchema);
