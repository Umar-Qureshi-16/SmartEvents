const Review = require('../models/Review');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

// @desc    Create a new review
// @route   POST /api/v1/reviews
// @access  Private (Customer only)
exports.createReview = async (req, res) => {
    try {
        const { eventId, rating, comment } = req.body;
        const userId = req.user.id || req.user._id;

        // Ensure rating is between 1 and 5
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Please provide a vaild rating between 1 and 5' });
        }

        // Verify that the customer has a confirmed booking for this event
        const booking = await Booking.findOne({
            customerId: userId,
            eventId: eventId,
            status: 'confirmed'
        });

        if (!booking) {
            return res.status(403).json({ success: false, message: 'You must have a confirmed booking for this event to leave a review.' });
        }

        // Optional: Check if user already reviewed this event
        const existingReview = await Review.findOne({ event: eventId, user: userId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this event.' });
        }

        // Create review
        const review = await Review.create({
            event: eventId,
            user: userId,
            rating,
            comment
        });

        // Update Event average rating
        const reviews = await Review.find({ event: eventId });
        const numberOfReviews = reviews.length;
        const averageRating = reviews.reduce((acc, item) => acc + item.rating, 0) / numberOfReviews;

        const updatedEvent = await Event.findByIdAndUpdate(eventId, {
            averageRating: averageRating,
            numberOfReviews: numberOfReviews
        }, { new: true });

        // Update Trust Score for Provider
        if (updatedEvent) {
            const { recalculateTrustScore } = require('../services/trustScoreService');
            await recalculateTrustScore(updatedEvent.createdBy);
        }

        // Populate user for the response
        await review.populate('user', 'name avatar');

        res.status(201).json({
            success: true,
            data: review
        });

    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ success: false, message: 'Server Error while creating review' });
    }
};

// @desc    Get all reviews for an event
// @route   GET /api/v1/reviews/event/:eventId
// @access  Public
exports.getEventReviews = async (req, res) => {
    try {
        const { eventId } = req.params;

        const reviews = await Review.find({ event: eventId })
            .populate('user', 'name avatar profileImage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server Error while fetching reviews' });
    }
};

// @desc    Delete a review
// @route   DELETE /api/v1/reviews/:id
// @access  Private (Admin or Review Owner)
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Check ownership or admin status
        if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
        }

        const eventId = review.event;

        await review.deleteOne();

        // Update event rating
        const reviews = await Review.find({ event: eventId });
        const numberOfReviews = reviews.length;
        const averageRating = numberOfReviews > 0 ? reviews.reduce((acc, item) => acc + item.rating, 0) / numberOfReviews : 0;

        await Event.findByIdAndUpdate(eventId, {
            averageRating: averageRating,
            numberOfReviews: numberOfReviews
        });

        res.status(200).json({
            success: true,
            data: {}
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Server Error while deleting review' });
    }
};

exports.getProviderReviews = async (req, res, next) => {
    try {
        if (req.user.role !== 'provider') return res.status(403).json({ message: 'Provider access required' });
        const events = await Event.find({ createdBy: req.user.id });
        const reviews = await Review.find({ event: { $in: events.map(e => e._id) } })
            .populate('user', 'name email')
            .populate('event', 'title')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: reviews });
    } catch (error) {
        next(error);
    }
};
