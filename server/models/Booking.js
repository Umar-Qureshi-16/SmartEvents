const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, // Optional, can be a custom lead
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // Direct event booking
    // The organizer's own event (plan) this service is booked for, so all the
    // services of one event are shown together.
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventPlan', index: true },
    eventDetails: {
        eventType: { type: String, required: true },
        date: { type: Date, required: true },
        // Last day of a multi-day event.
        endDate: { type: Date },
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
        timestamp: { type: Date, default: Date.now },
        // Set when the author changed this offer before the other side answered.
        previousPrice: Number,
        editedAt: Date
    }],

    // Free chat between the two parties next to the offers. Kept apart from
    // negotiationHistory so a message never changes whose turn it is to offer.
    chatMessages: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, maxlength: 1000, required: true },
        createdAt: { type: Date, default: Date.now }
    }],

    // Design Studio: what the event should look like, shared by both parties.
    designBrief: {
        theme: { type: String, maxlength: 120 },
        style: { type: String, maxlength: 120 },
        colors: [{ type: String, maxlength: 20 }],
        budget: { type: Number, min: 0 },
        guestCount: { type: Number, min: 0 },
        notes: { type: String, maxlength: 2000 },
        references: [{
            url: { type: String, maxlength: 600 },
            caption: { type: String, maxlength: 160 },
            addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        }],
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date },
    },
    // Concepts the AI drafted from the brief; one can be selected to follow.
    designConcepts: [{
        title: String,
        tier: { type: String, enum: ['Essential', 'Signature', 'Luxe'] },
        summary: String,
        palette: [String],
        elements: [{ item: String, description: String, cost: Number }],
        totalCost: Number,
        selected: { type: Boolean, default: false },
        selectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        source: { type: String, enum: ['ai', 'template'], default: 'ai' },
        createdAt: { type: Date, default: Date.now },
    }],
    // Conversation about decor, theme and style, kept apart from price offers.
    designMessages: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 1500 },
        createdAt: { type: Date, default: Date.now },
    }]
}, { timestamps: true, optimisticConcurrency: true });

bookingSchema.index({ vendorId: 1, status: 1, updatedAt: -1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
