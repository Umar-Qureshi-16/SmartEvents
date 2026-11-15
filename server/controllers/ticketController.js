const QRCode = require('qrcode');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const notificationService = require('../services/notificationService');

/**
 * Renders the scannable pass as a data URI.
 *
 * The wallet previously fell back to fetching QR images from a third-party
 * service (api.qrserver.com), which leaked ticket numbers off-platform and
 * broke wherever that host was unreachable — including a venue gate with poor
 * connectivity, which is exactly where it is needed.
 */
async function renderQr(ticket) {
    try {
        return await QRCode.toDataURL(ticket.ticketNumber, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 320,
        });
    } catch (err) {
        console.error('QR render failed:', err.message);
        return null;
    }
}

exports.purchaseTicket = async (req, res) => {
    try {
        const { eventId } = req.body;
        // Only known labels are accepted; the amount is never taken from the client.
        const ticketType = ['General', 'VIP'].includes(req.body.ticketType) ? req.body.ticketType : 'General';
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        if (['cancelled', 'completed'].includes(event.status)) {
            return res.status(409).json({ success: false, message: `Tickets are not available: this event is ${event.status}.` });
        }

        // Capacity and fair-use limits. Refunded and cancelled passes free their seat.
        const sold = await Ticket.countDocuments({ event: eventId, status: { $in: ['active', 'checked_in'] } });
        if (event.capacity && sold >= event.capacity) {
            return res.status(409).json({ success: false, message: 'Sorry, this event is sold out.' });
        }
        const mine = await Ticket.countDocuments({ event: eventId, attendee: req.user.id, status: { $in: ['active', 'checked_in'] } });
        if (mine >= 10) {
            return res.status(409).json({ success: false, message: 'You have reached the limit of 10 passes for this event.' });
        }

        const ticketNumber = `TKT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const qrCodeData = JSON.stringify({
            ticketNumber,
            eventId: event._id,
            attendeeId: req.user.id,
            issuedAt: new Date().toISOString()
        });

        const newTicket = new Ticket({
            event: eventId,
            attendee: req.user.id,
            ticketType,
            ticketNumber,
            qrCodeData,
            price: event.price || 0,
            currency: 'USD',
            status: 'active'
        });

        await newTicket.save();

        // Notification must never fail the purchase it is announcing.
        try {
            await notificationService.createNotification({
                recipient: req.user.id,
                title: 'Ticket Confirmed!',
                message: `Your ${ticketType} ticket for "${event.title}" is ready. Ticket #: ${ticketNumber}`,
                type: 'system'
            });
        } catch (notifyErr) {
            console.error('Ticket notification failed (non-fatal):', notifyErr);
        }

        res.status(201).json({
            success: true,
            data: { ...newTicket.toObject(), qrCode: await renderQr(newTicket) },
            message: 'Ticket registered successfully'
        });
    } catch (err) {
        console.error('Purchase Ticket Error:', err);
        res.status(500).json({ success: false, message: 'Server error registering ticket' });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ attendee: req.user.id })
            .populate('event')
            .sort({ createdAt: -1 })
            .lean();

        // Attach a rendered QR to each pass so the wallet needs no external
        // service to display it.
        const withQr = await Promise.all(
            tickets.map(async (t) => ({ ...t, qrCode: await renderQr(t) }))
        );

        res.json({ success: true, data: withQr });
    } catch (err) {
        console.error('Fetch Tickets Error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching tickets' });
    }
};

exports.scanCheckInTicket = async (req, res) => {
    try {
        const { ticketNumber } = req.body;
        const ticket = await Ticket.findOne({ ticketNumber })
            .populate('event')
            .populate('attendee', 'name email');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Invalid ticket code' });
        }

        if (ticket.status === 'checked_in') {
            return res.status(400).json({
                success: false,
                message: `DUPLICATE ENTRY DETECTED: Ticket ${ticketNumber} was already scanned at ${new Date(ticket.checkInTime).toLocaleTimeString()}`
            });
        }

        // A provider may only scan passes for events they created.
        if (req.user.role === 'provider' && ticket.event?.createdBy?.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'This pass belongs to an event you do not run.' });
        }

        ticket.status = 'checked_in';
        ticket.checkInTime = new Date();
        ticket.checkedInBy = req.user.id;
        await ticket.save();

        res.json({
            success: true,
            data: ticket,
            message: `VALID TICKET: Welcome ${ticket.attendee.name}! Checked in for "${ticket.event.title}".`
        });
    } catch (err) {
        console.error('Check-in error:', err);
        res.status(500).json({ success: false, message: 'Server error scanning ticket' });
    }
};

// An attendee can cancel an unused pass; the seat goes back on sale.
exports.cancelTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (String(ticket.attendee) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'You can only cancel your own tickets.' });
        }
        if (ticket.status !== 'active') {
            return res.status(409).json({ success: false, message: `A ${ticket.status.replace('_', ' ')} ticket cannot be cancelled.` });
        }
        ticket.status = 'cancelled';
        await ticket.save();
        res.json({ success: true, data: ticket, message: 'Ticket cancelled.' });
    } catch (err) {
        console.error('Cancel Ticket Error:', err);
        res.status(500).json({ success: false, message: 'Server error cancelling ticket' });
    }
};

// Ticket sales for an event: visible to the event's owner and to admins.
exports.getEventTickets = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        if (!isAdmin && String(event.createdBy) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Only the event owner can view ticket sales.' });
        }
        const tickets = await Ticket.find({ event: event._id })
            .populate('attendee', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        const live = tickets.filter(t => ['active', 'checked_in'].includes(t.status));
        res.json({
            success: true,
            data: {
                summary: {
                    capacity: event.capacity || null,
                    sold: live.length,
                    checkedIn: tickets.filter(t => t.status === 'checked_in').length,
                    cancelled: tickets.filter(t => t.status === 'cancelled').length,
                    revenue: live.reduce((sum, t) => sum + (t.price || 0), 0)
                },
                tickets: tickets.map(t => ({
                    id: t._id, ticketNumber: t.ticketNumber, status: t.status, price: t.price,
                    attendee: t.attendee ? { name: t.attendee.name, email: t.attendee.email } : null,
                    purchasedAt: t.createdAt, checkInTime: t.checkInTime
                }))
            }
        });
    } catch (err) {
        console.error('Event Tickets Error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching ticket sales' });
    }
};
