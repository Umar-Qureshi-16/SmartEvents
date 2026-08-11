const Event = require('../models/Event');
const { generateUserEmbeddings } = require('./aiService');

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
        if (!event) throw new Error('Event not found.');
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
        if (!event) throw new Error('Event not found.');

        // Ensure user is the owner or admin
        if (event.createdBy.toString() !== userId) {
            throw new Error('Access denied. You do not own this event.');
        }

        Object.assign(event, updateData);
        return await event.save();
    }

    async deleteEvent(id, userId, role) {
        const event = await Event.findById(id);
        if (!event) throw new Error('Event not found.');

        if (role !== 'admin' && event.createdBy.toString() !== userId) {
            throw new Error('Access denied. Insufficient permissions.');
        }

        return await Event.findByIdAndDelete(id);
    }

    async getOrganizerEvents(organizerId) {
        return await Event.find({ createdBy: organizerId }).sort({ createdAt: -1 });
    }
}

module.exports = new EventService();
