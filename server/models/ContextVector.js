const mongoose = require('mongoose');

const contextVectorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    // The vector embedding mapped from Gemini's text-embedding-004 model
    embedding: {
        type: [Number],
        required: true
    },
    type: {
        type: String,
        enum: ['profile', 'service', 'booking', 'aggregate'],
        default: 'aggregate'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ContextVector', contextVectorSchema);
