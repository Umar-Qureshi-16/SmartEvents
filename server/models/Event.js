const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true }, // e.g., Wedding, Corporate, Concert, Birthday, Conference, Exhibition
    date: { type: Date, required: true },
    // Last day for events that run over several days (a three-day conference).
    endDate: { type: Date },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
    capacity: { type: Number, default: 100 },
    location: { type: String },
    image: { type: String }, // Path to uploaded image
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound index for fast filtering as requested
eventSchema.index({ status: 1, date: 1, category: 1 });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
