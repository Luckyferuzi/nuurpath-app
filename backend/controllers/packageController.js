const TravelPackage = require('../models/TravelPackage');​
​// @route GET api/packages​
// @desc Get all travel packages​
// @access Public​
exports.getAllPackages = async (req, res) => {​
    try {​
        const packages = await TravelPackage.find();​
        res.json(packages);​
    } catch (err) {​
        console.error(err.message);​
        res.status(500).send('Server Error');​
    }​
};​
​
// @route GET api/packages/:id​
// @desc Get single travel package by ID​
// @access Public​
exports.getPackageById = async (req, res) => {​
    try {​
        const package = await
TravelPackage.findById(req.params.id);​
    if (!package) {​
        return res.status(404).json({ msg: 'Package not
found' });​
        }​
        res.json(package);​
    } catch (err) {​
        console.error(err.message);​
        if (err.kind === 'ObjectId') {​
            return res.status(404).json({ msg: 'Package not
found' });​
        }​
        res.status(500).send('Server Error');​
    }​
};​
​
// @route POST api/packages​
// @desc Create a new travel package​
// @access Private (Admin only)​
exports.createPackage = async (req, res) => {​
    const { title, destination, duration, price, description,
itinerary, inclusions, exclusions, images, availability } =
req.body;​
​
    try {​
        const newPackage = new TravelPackage({​
            title,​
            destination,​
            duration,​price,​
            description,​
            itinerary,​
            inclusions,​
            exclusions,​
            images,​
            availability,​
            ​
        });​
        const package = await newPackage.save();​
        res.status(201).json(package);​
    } catch (err) {​
        console.error(err.message);​
        res.status(500).send('Server Error');​
    }​
};​
​
// @route PUT api/packages/:id​
// @desc Update a travel package​
// @access Private (Admin only)​
exports.updatePackage = async (req, res) => {​
    const { title, destination, duration, price, description,
itinerary, inclusions, exclusions, images, availability } =
req.body;​
​
    // Build package object​
    const packageFields = {};​
    if (title) packageFields.title = title;​
    if (destination) packageFields.destination = destination;​
    if (duration) packageFields.duration = duration;​
    if (price) packageFields.price = price;​
    if (description) packageFields.description = description;​
    if (itinerary) packageFields.itinerary = itinerary;​
    if (inclusions) packageFields.inclusions = inclusions;​
    if (exclusions) packageFields.exclusions = exclusions;​
    if (images) packageFields.images = images;​
    if (availability) packageFields.availability =
availability;​
​
    try {​
        let package = await
TravelPackage.findById(req.params.id);​
​
        if (!package) {​
            return res.status(404).json({ msg: 'Package not
found' });​
        }​
​​
        package = await TravelPackage.findByIdAndUpdate(​
            req.params.id,​
            { $set: packageFields },​
            { new: true }​
        );​
        res.json(package);​
    } catch (err) {​
        console.error(err.message);​
        if (err.kind === 'ObjectId') {​
            return res.status(404).json({ msg: 'Package not
found' });​
        }​
        res.status(500).send('Server Error');​
    }​
};​
​
// @route DELETE api/packages/:id​
// @desc Delete a travel package​
// @access Private (Admin only)​
exports.deletePackage = async (req, res) => {​
    try {​
        const package = await
TravelPackage.findById(req.params.id);​
​
        if (!package) {​
            return res.status(404).json({ msg: 'Package not
found' });​
        }​
​
        await TravelPackage.findByIdAndDelete(req.params.id);​
        res.json({ msg: 'Package removed' });​
    } catch (err) {​
        console.error(err.message);​
        if (err.kind === 'ObjectId') {​
            return res.status(404).json({ msg: 'Package not
found' });​
        }​
        res.status(500).send('Server Error');​
    }​
};​
