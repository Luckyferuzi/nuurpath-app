const Review = require('../models/Review');
const TravelPackage = require('../models/TravelPackage');

// @route   POST api/reviews
// @desc    Create a new review for a package
// @access  Private (User only)
exports.createReview = async (req, res) => {
    const { packageId, rating, comment } = req.body;

    try {
        // Check if the package exists
        const travelPackage = await TravelPackage.findById(packageId);
        if (!travelPackage) {
            return res.status(404).json({ msg: 'Travel package not found' });
        }

        // Check if user has already reviewed this package (optional, based on your design)
        const existingReview = await Review.findOne({ user: req.user.id, package: packageId });
        if (existingReview) {
            return res.status(400).json({ msg: 'You have already reviewed this package' });
        }

        const newReview = new Review({
            user: req.user.id, // Comes from authMiddleware
            package: packageId,
            rating,
            comment,
        });

        const review = await newReview.save();
        res.status(201).json(review);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/reviews/:packageId
// @desc    Get all reviews for a specific travel package
// @access  Public
exports.getReviewsByPackageId = async (req, res) => {
    try {
        const reviews = await Review.find({ package: req.params.packageId })
            .populate('user', ['name', 'email']) // Populate user details
            .sort({ createdAt: -1 }); // Latest reviews first
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/reviews/user/:userId
// @desc    Get all reviews written by a specific user (can be private if needed)
// @access  Public (or Private if you only want user to see their own reviews)
exports.getReviewsByUserId = async (req, res) => {
    try {
        // For security, if this route is used by a user to see THEIR OWN reviews,
        // you might want to check req.user.id === req.params.userId
        const reviews = await Review.find({ user: req.params.userId })
            .populate('package', ['title', 'destination']) // Populate package details
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   DELETE api/reviews/:id
// @desc    Delete a review (only by owner or admin)
// @access  Private (User or Admin)
exports.deleteReview = async (req, res) => {
    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ msg: 'Review not found' });
        }

        // Check if user is the owner of the review or an admin
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await review.deleteOne(); // Use deleteOne() or findByIdAndDelete()
        res.json({ msg: 'Review removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Review not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @route   PUT api/reviews/:id
// @desc    Update a review (only by owner)
// @access  Private (User only)
exports.updateReview = async (req, res) => {
    const { rating, comment } = req.body;

    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ msg: 'Review not found' });
        }

        // Check if user is the owner of the review
        if (review.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;

        await review.save();
        res.json(review);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Review not found' });
        }
        res.status(500).send('Server Error');
    }
};
