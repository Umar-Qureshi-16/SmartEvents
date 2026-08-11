const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

exports.purchaseTicket = async (req, res) => {
    try {
        const { eventId, ticketType, price } = req.body;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
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
            ticketType: ticketType || 'General',
            ticketNumber,
            qrCodeData,
            price: price || 0,
            currency: 'USD',
            status: 'active'
        });

        await newTicket.save();

        // Send notification
        await Notification.create({
            user: req.user.id,
            title: 'Ticket Confirmed!',
            message: `Your ${ticketType || 'General'} ticket for "${event.title}" is ready. Ticket #: ${ticketNumber}`,
            type: 'system'
        });

        res.status(201).json({
            success: true,
            data: newTicket,
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
            .sort({ createdAt: -1 });

        res.json({ success: true, data: tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching tickets' });
    }
};

exports.scanCheckInTicket = async (req, res) => {
    try {
        const { ticketNumber } = req.body;
        const ticket = await Ticket.findOne({ ticketNumber }).populate('event').populate('attendee', 'name email');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Invalid ticket code' });
        }

        if (ticket.status === 'checked_in') {
            return res.status(400).json({
                success: false,
                message: `DUPLICATE ENTRY DETECTED: Ticket ${ticketNumber} was already scanned at ${new Date(ticket.checkInTime).toLocaleTimeString()}`
            });
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
