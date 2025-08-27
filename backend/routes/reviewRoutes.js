const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware'); // For admin-only review management if desired

// @route   POST api/reviews
// @desc    Create a new review
// @access  Private (User only)
router.post('/', authMiddleware, reviewController.createReview);

// @route   GET api/reviews/package/:packageId
// @desc    Get all reviews for a specific travel package
// @access  Public
router.get('/package/:packageId', reviewController.getReviewsByPackageId);

// @route   GET api/reviews/user/:userId
// @desc    Get all reviews by a specific user
// @access  Public (or add authMiddleware if only user can see their reviews)
router.get('/user/:userId', reviewController.getReviewsByUserId);

// @route   PUT api/reviews/:id
// @desc    Update a review (owner only)
// @access  Private (User)
router.put('/:id', authMiddleware, reviewController.updateReview);

// @route   DELETE api/reviews/:id
// @desc    Delete a review (owner or admin)
// @access  Private (User or Admin)
// Note: You might want a separate admin route for deleting any review
router.delete('/:id', authMiddleware, reviewController.deleteReview);
// Admin specific delete route example:
// router.delete('/:id/admin', authMiddleware, adminAuthMiddleware, reviewController.deleteReview);

module.exports = router;
