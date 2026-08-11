const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, default: 'Corporate' },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    guestCount: { type: Number, default: 100 },
    budget: {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        currency: { type: String, default: 'USD' }
    },
    servicesNeeded: [{ type: String }],
    images: [{ type: String }],
    status: {
        type: String,
        enum: ['draft', 'open', 'in_review', 'confirmed', 'completed', 'cancelled'],
        default: 'open'
    },
    acceptedBid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', default: null },
    bidsCount: { type: Number, default: 0 },
    deadline: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
