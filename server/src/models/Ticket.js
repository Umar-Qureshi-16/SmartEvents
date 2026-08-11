const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketType: {
        type: String,
        enum: ['Free', 'General', 'VIP', 'Student', 'Early Bird'],
        default: 'General'
    },
    ticketNumber: { type: String, required: true, unique: true },
    qrCodeData: { type: String, required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: {
        type: String,
        enum: ['active', 'checked_in', 'refunded', 'cancelled'],
        default: 'active'
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    checkInTime: { type: Date, default: null },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
