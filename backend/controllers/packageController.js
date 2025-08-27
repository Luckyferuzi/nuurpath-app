const TravelPackage = require('../models/TravelPackage');
const AppError = require('../utils/AppError'); // Assuming you have this from previous step

// @route   GET api/packages
// @desc    Get all travel packages with search and filter capabilities
// @access  Public
exports.getAllPackages = async (req, res, next) => {
    try {
        const queryObj = {};

        // 1. Filtering by Destination (case-insensitive)
        if (req.query.destination) {
            queryObj.destination = { $regex: req.query.destination, $options: 'i' };
        }

        // 2. Filtering by Price/Budget
        if (req.query.minPrice || req.query.maxPrice) {
            queryObj.price = {};
            if (req.query.minPrice) {
                queryObj.price.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                queryObj.price.$lte = parseFloat(req.query.maxPrice);
            }
        }

        // 3. Filtering by Type of Travel
        if (req.query.type) {
            // Ensure the type matches one of your defined enum values if applicable
            queryObj.type = req.query.type;
        }

        // 4. Filtering by Dates (Availability)
        // This assumes 'availability.startDate' and 'availability.endDate' fields exist
        if (req.query.startDate || req.query.endDate) {
            queryObj['availability.startDate'] = {};
            if (req.query.startDate) {
                // Find packages available *after or on* the requested start date
                queryObj['availability.startDate'].$lte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                // Find packages available *before or on* the requested end date
                queryObj['availability.endDate'].$gte = new Date(req.query.endDate);
            }
        }

        // Execute the query
        const packages = await TravelPackage.find(queryObj);

        res.json(packages);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error while fetching packages', 500));
    }
};

// ... other package controller functions (getPackageById, createPackage, etc.) ...
