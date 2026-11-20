const mongoose = require('mongoose');

/**
 * A design a vendor offers to everyone (decor concept, menu, shoot style...),
 * shown on their public profile and bookable as a starting point. Distinct
 * from a booking's own Design Studio concepts, which belong to one booking.
 */
const vendorDesignSchema = new mongoose.Schema({
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    eventType: { type: String, default: 'Wedding', maxlength: 60 },
    theme: { type: String, maxlength: 120 },
    style: { type: String, maxlength: 120 },
    // The vendor's or client's own idea the design was made from.
    idea: { type: String, maxlength: 600 },
    summary: { type: String, maxlength: 800 },
    palette: [{ type: String, match: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i }],
    elements: [{
        item: { type: String, maxlength: 80 },
        description: { type: String, maxlength: 300 },
        cost: { type: Number, min: 0 },
    }],
    totalCost: { type: Number, min: 0, required: true },
    image: { type: String },
    // AI-rendered picture of the décor (served at /api/v1/designs/:id/image).
    render: { data: { type: Buffer, select: false }, mime: { type: String, select: false } },
    published: { type: Boolean, default: false },
    source: { type: String, enum: ['ai', 'template', 'manual'], default: 'manual' },
}, { timestamps: true });

module.exports = mongoose.model('VendorDesign', vendorDesignSchema);
