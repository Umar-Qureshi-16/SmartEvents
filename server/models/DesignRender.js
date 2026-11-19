const mongoose = require('mongoose');

/**
 * A generated picture of a booking's design concept, stored once and served
 * from /api/v1/designs/concepts/:bookingId/:conceptId/image. Kept apart from
 * the booking so reading a booking never loads image bytes.
 */
const designRenderSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    data: { type: Buffer, required: true },
    mime: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('DesignRender', designRenderSchema);
