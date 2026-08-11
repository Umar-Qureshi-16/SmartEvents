const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    },
    sentiment: {
        score: Number,
        label: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
            default: 'neutral'
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
