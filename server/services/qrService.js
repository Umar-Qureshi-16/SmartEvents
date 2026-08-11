const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const crypto = require('crypto');

const generateTicket = async (bookingId, eventId, userId) => {
    try {
        // Generate a unique ticket number
        const ticketNumber = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // Generate QR Code data (for now just the ticket number or a signature)
        const qrData = JSON.stringify({
            ticketNumber,
            eventId,
            userId,
            timestamp: new Date().getTime()
        });

        const qrCodeBase64 = await QRCode.toDataURL(qrData);

        const ticket = new Ticket({
            bookingId,
            event: eventId,
            attendee: userId,
            ticketNumber,
            qrCode: qrCodeBase64
        });

        await ticket.save();
        return ticket;
    } catch (err) {
        console.error('QR Generation Error:', err);
        throw err;
    }
};

module.exports = { generateTicket };
