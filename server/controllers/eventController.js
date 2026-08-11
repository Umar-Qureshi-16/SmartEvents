const eventService = require('../services/eventService');
const { asyncHandler } = require('../middleware/errors');

exports.getEvents = asyncHandler(async (req, res, next) => {
    const result = await eventService.getAllEvents(req.query);
    res.json({
        success: true,
        ...result,
        message: 'Enterprise event nodes fetched successfully'
    });
});

exports.getEventById = asyncHandler(async (req, res, next) => {
    const event = await eventService.getEventById(req.params.id);
    res.json({ success: true, data: event });
});

exports.createEvent = asyncHandler(async (req, res, next) => {
    const eventData = req.body;
    if (req.file) {
        eventData.image = `/uploads/${req.file.filename}`;
    }
    const event = await eventService.createEvent(eventData, req.user.id);
    res.status(201).json({ success: true, data: event, message: 'Event successfully created in our system.' });
});

exports.updateEvent = asyncHandler(async (req, res, next) => {
    const eventData = req.body;
    if (req.file) {
        eventData.image = `/uploads/${req.file.filename}`;
    }
    const event = await eventService.updateEvent(req.params.id, eventData, req.user.id);
    res.json({ success: true, data: event, message: 'Event details updated.' });
});

exports.deleteEvent = asyncHandler(async (req, res, next) => {
    await eventService.deleteEvent(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, message: 'Event removed from ecosystem.' });
});

exports.getMyEvents = asyncHandler(async (req, res, next) => {
    const events = await eventService.getOrganizerEvents(req.user.id);
    res.json({ success: true, data: events });
});

exports.getEventReadiness = asyncHandler(async (req, res, next) => {
    const event = await eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Logic to calculate readiness score
    let score = 20;
    if (event.location) score += 20;
    if (event.date) score += 20;
    if (event.capacity > 0) score += 20;
    if (event.image) score += 20;

    const checks = [
        { label: 'Core Metadata', status: event.title ? 'pass' : 'fail' },
        { label: 'Logistics Definition', status: event.location ? 'pass' : 'fail' },
        { label: 'Financial Guardrails', status: event.price > 0 ? 'pass' : 'fail' },
        { label: 'Capacity Mapping', status: event.capacity > 0 ? 'pass' : 'fail' },
        { label: 'AI Optimization Depth', status: event.image ? 'pass' : 'fail' },
    ];

    res.json({
        success: true,
        data: {
            score,
            checks
        }
    });
});
