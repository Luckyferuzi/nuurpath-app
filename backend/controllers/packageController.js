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

// @route   GET api/packages/:id
// @desc    Get a single travel package by ID
// @access  Public
exports.getPackageById = async (req, res, next) => {
    try {
        const package = await TravelPackage.findById(req.params.id);
        if (!package) {
            return next(new AppError('Package not found', 404));
        }
        res.json(package);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return next(new AppError('Package not found', 404));
        }
        next(new AppError('Server Error', 500));
    }
};

// @route   POST api/packages
// @desc    Create a new travel package (Admin only)
// @access  Private/Admin
exports.createPackage = async (req, res, next) => {
    try {
        const newPackage = new TravelPackage(req.body);
        const package = await newPackage.save();
        res.status(201).json(package);
    } catch (err) {
        console.error(err.message);
        next(new AppError('Server Error while creating package', 500));
    }
};

// @route   PUT api/packages/:id
// @desc    Update a travel package (Admin only)
// @access  Private/Admin
exports.updatePackage = async (req, res, next) => {
    try {
        const package = await TravelPackage.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!package) {
            return next(new AppError('Package not found', 404));
        }
        res.json(package);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return next(new AppError('Package not found', 404));
        }
        next(new AppError('Server Error', 500));
    }
};

// @route   DELETE api/packages/:id
// @desc    Delete a travel package (Admin only)
// @access  Private/Admin
exports.deletePackage = async (req, res, next) => {
    try {
        const package = await TravelPackage.findByIdAndDelete(req.params.id);
        if (!package) {
            return next(new AppError('Package not found', 404));
        }
        res.json({ msg: 'Package removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return next(new AppError('Package not found', 404));
        }
        next(new AppError('Server Error', 500));
    }
};
