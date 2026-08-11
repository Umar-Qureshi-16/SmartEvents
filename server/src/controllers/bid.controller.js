const Bid = require('../models/Bid');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

exports.placeBid = async (req, res) => {
    try {
        const { eventId, amount, coverLetter, deliverables, timeline, portfolioItems } = req.body;
        if (!eventId || !amount || !coverLetter) {
            return res.status(400).json({ success: false, message: 'Event ID, amount, and cover letter are required' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.status !== 'open') {
            return res.status(400).json({ success: false, message: 'Bidding is closed for this event' });
        }

        const newBid = new Bid({
            event: eventId,
            vendor: req.user.id,
            amount,
            coverLetter,
            deliverables: deliverables || [],
            timeline: timeline || 'Standard',
            portfolioItems: portfolioItems || [],
            status: 'pending'
        });

        await newBid.save();

        // Increment bid count on event
        event.bidsCount = (event.bidsCount || 0) + 1;
        await event.save();

        // Send notification to organizer
        await Notification.create({
            user: event.organizer,
            title: 'New Bid Received',
            message: `A vendor placed a bid of $${amount} on your event "${event.title}".`,
            type: 'bid'
        });

        res.status(201).json({ success: true, data: newBid, message: 'Bid submitted successfully' });
    } catch (err) {
        console.error('Place Bid Error:', err);
        res.status(500).json({ success: false, message: 'Server error placing bid' });
    }
};

exports.getBidsByEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized access to event bids' });
        }

        const bids = await Bid.find({ event: req.params.eventId })
            .populate('vendor', 'name email avatar vendorProfile')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: bids });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching bids' });
    }
};

exports.getMyBids = async (req, res) => {
    try {
        const bids = await Bid.find({ vendor: req.user.id })
            .populate('event')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: bids });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching vendor bids' });
    }
};

exports.counterOffer = async (req, res) => {
    try {
        const { amount, message } = req.body;
        if (!amount) return res.status(400).json({ success: false, message: 'Counter-offer amount is required' });

        const bid = await Bid.findById(req.params.id).populate('event');
        if (!bid) return res.status(404).json({ success: false, message: 'Bid not found' });

        const fromRole = req.user.role === 'vendor' ? 'vendor' : 'organizer';

        bid.counterOffers.push({
            from: fromRole,
            amount,
            message: message || ''
        });

        bid.amount = amount;
        bid.status = 'counter_offered';
        await bid.save();

        // Target user to notify
        const targetUserId = fromRole === 'organizer' ? bid.vendor : bid.event.organizer;
        await Notification.create({
            user: targetUserId,
            title: 'Counter-Offer Received',
            message: `A counter-offer of $${amount} was proposed for "${bid.event.title}".`,
            type: 'counter_offer'
        });

        res.json({ success: true, data: bid, message: 'Counter-offer submitted successfully' });
    } catch (err) {
        console.error('Counter offer error:', err);
        res.status(500).json({ success: false, message: 'Server error creating counter-offer' });
    }
};

exports.acceptBid = async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id).populate('event');
        if (!bid) return res.status(404).json({ success: false, message: 'Bid not found' });

        if (bid.event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        bid.status = 'accepted';
        await bid.save();

        // Update event status
        const event = await Event.findById(bid.event._id);
        event.acceptedBid = bid._id;
        event.status = 'confirmed';
        await event.save();

        // Notify vendor
        await Notification.create({
            user: bid.vendor,
            title: 'Bid Accepted!',
            message: `Congratulations! Your bid of $${bid.amount} for "${event.title}" was accepted.`,
            type: 'accepted'
        });

        res.json({ success: true, data: bid, message: 'Bid accepted! Contract formed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error accepting bid' });
    }
};

exports.rejectBid = async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id);
        if (!bid) return res.status(404).json({ success: false, message: 'Bid not found' });

        bid.status = 'rejected';
        await bid.save();
        res.json({ success: true, message: 'Bid rejected' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
