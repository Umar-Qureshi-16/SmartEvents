const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
        type: String,
        enum: ['pending', 'paid', 'released', 'refunded', 'disputed'],
        default: 'pending'
    },
    stripePaymentIntentId: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Payment', paymentSchema);
