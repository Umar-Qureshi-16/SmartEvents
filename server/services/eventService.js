const Event = require('../models/Event');
const { generateUserEmbeddings } = require('./aiService');
const { NotFoundError, ForbiddenError, ConflictError } = require('../utils/AppError');

class EventService {
    async getAllEvents(filters) {
        const { page = 1, limit = 12, category, status, date, minPrice, maxPrice, location, search, sortBy } = filters;
        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        if (location) query.location = { $regex: location, $options: 'i' };

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOptions = { createdAt: -1 };
        if (sortBy === 'price_asc') sortOptions = { price: 1 };
        if (sortBy === 'price_desc') sortOptions = { price: -1 };
        if (sortBy === 'date') sortOptions = { date: 1 };

        const skip = (Number(page) - 1) * Number(limit);

        const [events, total] = await Promise.all([
            Event.find(query)
                .populate('createdBy', 'name')
                .skip(skip)
                .limit(Number(limit))
                .sort(sortOptions),
            Event.countDocuments(query)
        ]);

        return {
            events,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    async getEventById(id) {
        const event = await Event.findById(id).populate('createdBy', 'name email');
        if (!event) throw new NotFoundError('Event not found.');
        return event;
    }

    async createEvent(eventData, userId) {
        const event = new Event({
            ...eventData,
            createdBy: userId
        });
        return await event.save();
    }

    async updateEvent(id, updateData, userId) {
        const event = await Event.findById(id);
        if (!event) throw new NotFoundError('Event not found.');

        // Ensure user is the owner or admin
        if (event.createdBy.toString() !== userId) {
            throw new ForbiddenError('Access denied. You do not own this event.');
        }

        // Whitelist editable fields. Assigning the raw body let an owner rewrite
        // createdBy (transferring or stealing events) and any other schema path.
        const editable = ['title', 'price', 'description', 'category', 'date', 'status', 'capacity', 'location', 'image'];
        for (const key of editable) {
            if (updateData[key] !== undefined) event[key] = updateData[key];
        }
        return await event.save();
    }

    async deleteEvent(id, userId, role) {
        const event = await Event.findById(id);
        if (!event) throw new NotFoundError('Event not found.');

        if (!['admin', 'superadmin'].includes(role) && event.createdBy.toString() !== userId) {
            throw new ForbiddenError('Access denied. Insufficient permissions.');
        }

        // Deleting an event with live bookings would orphan them (and any
        // funds held in escrow), so require them to be settled first.
        const Booking = require('../models/Booking');
        const live = await Booking.countDocuments({
            eventId: id,
            $or: [{ status: { $in: ['pending', 'negotiating', 'confirmed', 'disputed'] } }, { 'escrow.status': 'held' }]
        });
        if (live > 0) {
            throw new ConflictError(`This event has ${live} active booking(s). Cancel or complete them before deleting the event.`);
        }

        return await Event.findByIdAndDelete(id);
    }

    async getOrganizerEvents(organizerId) {
        return await Event.find({ createdBy: organizerId }).sort({ createdAt: -1 });
    }
}

module.exports = new EventService();
