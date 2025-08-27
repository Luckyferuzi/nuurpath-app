const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    // Reference to the User who wrote the review
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Reference to the TravelPackage being reviewed
    package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TravelPackage',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1, // Minimum rating is 1 star
        max: 5, // Maximum rating is 5 stars
    },
    comment: {
        type: String,
        required: true,
        trim: true, // Remove whitespace from both ends of a string
        maxlength: 500, // Optional: Limit review length
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Optional: Add a compound unique index to prevent a user from reviewing the same package multiple times
// ReviewSchema.index({ user: 1, package: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
