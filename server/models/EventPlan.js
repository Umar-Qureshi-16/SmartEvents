const mongoose = require('mongoose');

/**
 * An organizer's planning checklist for one event: dated tasks (book the venue,
 * catering, invitations, ...) that can be ticked off by hand, by Smartie, or
 * automatically when a booking with a vendor of the task's category is confirmed.
 */
const CATEGORIES = ['venue', 'catering', 'decoration', 'photography', 'music', 'makeup'];

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 600 },
    category: { type: String, enum: [...CATEGORIES, null], default: null },
    daysBefore: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['todo', 'done'], default: 'todo' },
    doneAt: { type: Date },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
});

const eventPlanSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    eventType: { type: String, default: 'Event', maxlength: 60 },
    date: { type: Date, required: true },
    // Last day when the event runs over several days; absent for one-day events.
    endDate: { type: Date },
    location: { type: String, default: '', maxlength: 120 },
    budget: { type: Number, min: 0 },
    sourceBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    tasks: [taskSchema],
}, { timestamps: true });

eventPlanSchema.index({ owner: 1, sourceBooking: 1 });

module.exports = mongoose.model('EventPlan', eventPlanSchema);
module.exports.CATEGORIES = CATEGORIES;
