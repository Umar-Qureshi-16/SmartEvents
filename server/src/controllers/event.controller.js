const Event = require('../models/Event');

exports.createEvent = async (req, res) => {
    try {
        const { title, description, category, date, location, guestCount, budget, servicesNeeded, deadline, images } = req.body;
        if (!title || !description || !date || !location || !budget || !budget.min || !budget.max) {
            return res.status(400).json({ success: false, message: 'Please provide all required event details' });
        }

        const newEvent = new Event({
            organizer: req.user.id,
            title,
            description,
            category: category || 'Corporate',
            date,
            location,
            guestCount: guestCount || 100,
            budget,
            servicesNeeded: servicesNeeded || ['catering'],
            images: images || [],
            deadline: deadline || new Date(Date.now() + 86400000 * 7),
            status: 'open'
        });

        await newEvent.save();
        res.status(201).json({ success: true, data: newEvent, message: 'Event published successfully' });
    } catch (err) {
        console.error('Create Event Error:', err);
        res.status(500).json({ success: false, message: 'Server error creating event' });
    }
};

exports.getEvents = async (req, res) => {
    try {
        const { category, search, minBudget, maxBudget } = req.query;
        let query = { status: 'open' };

        if (category && category !== 'All') {
            query.category = { $regex: category, $options: 'i' };
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        const events = await Event.find(query)
            .populate('organizer', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: events });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error fetching events' });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name email avatar phone')
            .populate('acceptedBid');
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        res.json({ success: true, data: event });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user.id })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: events });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await Event.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
