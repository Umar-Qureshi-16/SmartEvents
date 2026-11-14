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
    // Simulated escrow (FR-05). No real money moves: this records where the
    // agreed price sits so the whole hold -> release/refund lifecycle is visible.
    escrow: {
        status: { type: String, enum: ['none', 'held', 'released', 'refunded'], default: 'none' },
        amount: { type: Number },
        heldAt: { type: Date },
        settledAt: { type: Date }
    },
    disputeOutcome: { type: String, enum: ['refunded_customer', 'released_vendor'] },
    negotiationHistory: [{
        price: Number,
        message: String,
        action: {
            type: String,
            enum: ['offer', 'counter', 'accepted', 'rejected'],
            default: 'counter'
        },
        offeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true, optimisticConcurrency: true });

bookingSchema.index({ vendorId: 1, status: 1, updatedAt: -1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
