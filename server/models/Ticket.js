const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    attendee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ticketNumber: {
        type: String,
        required: true,
        unique: true
    },
    qrCode: {
        type: String // Base64 representation of QR code
    },
    status: {
        type: String,
        enum: ['valid', 'used', 'cancelled'],
        default: 'valid'
    },
    scannedAt: Date
}, { timestamps: true });

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
