const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, // Optional, can be a custom lead
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // Direct event booking
    eventDetails: {
        eventType: { type: String, required: true },
        date: { type: Date, required: true },
        location: { type: String, required: true },
        budget: { type: Number },
        message: { type: String }
    },
    status: {
        type: String,
        enum: ['pending', 'negotiating', 'confirmed', 'rejected', 'cancelled', 'completed', 'disputed', 'no_show'],
        default: 'pending'
    },
    offerPrice: { type: Number, required: true },
    lastPrice: { type: Number },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    disputeOutcome: { type: String, enum: ['refunded_customer', 'released_vendor'] },
    negotiationHistory: [{
        price: Number,
        message: String,
        offeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('Booking', bookingSchema);
