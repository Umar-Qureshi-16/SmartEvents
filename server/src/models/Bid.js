const mongoose = require('mongoose');

const counterOfferSchema = new mongoose.Schema({
    from: { type: String, enum: ['organizer', 'vendor'], required: true },
    amount: { type: Number, required: true },
    message: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const bidSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    coverLetter: { type: String, required: true },
    deliverables: [{ type: String }],
    timeline: { type: String, default: 'Standard' },
    portfolioItems: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'counter_offered', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    counterOffers: [counterOfferSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bid', bidSchema);
