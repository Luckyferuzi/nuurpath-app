const mongoose = require('mongoose');​
​
const TravelPackageSchema = new mongoose.Schema({​
    title: {​
        type: String,​
        required: true,​
    },​
    
    destination: {​
        type: String,​
        required: true,​
    },​
    duration: { // e.g., "7 Days / 6 Nights"​
        type: String,​
        required: true,​
    },​
    price: {​
        type: Number,​
        required: true,​
    },​
    description: {​
        type: String,​
        required: true,​
    },​
    itinerary: [​
        {​
            day: { type: Number, required: true },​
            activity: { type: String, required: true },​
        },​
],​
inclusions: [{ type: String }],​
exclusions: [{ type: String }],​
images: [{ type: String }], // URLs to images​
availability: {​
    startDate: { type: Date },​
    endDate: { type: Date },​
    // Or a more complex system for multiple departure
dates​
    },​
    createdAt: {​
        type: Date,​
        default: Date.now,​
    },​
});​
​
module.exports = mongoose.model('TravelPackage',
TravelPackageSchema);​

