const mongoose = require('mongoose');

/**
 * A designer's working board in the Design Lab: inspiration pictures pinned
 * from the search, and the canvas built from them (layers as JSON).
 *
 * key: "user:<id>" (a vendor's own lab), "design:<id>" (one vendor design)
 * or "booking:<id>" (shared by the organizer and vendor of a booking).
 */
const pinSchema = new mongoose.Schema({
    id: { type: String, maxlength: 80 },
    title: { type: String, maxlength: 200 },
    creator: { type: String, maxlength: 120 },
    license: { type: String, maxlength: 40 },
    licenseUrl: { type: String, maxlength: 300 },
    source: { type: String, maxlength: 60 },
    landing: { type: String, maxlength: 600 },
    thumb: { type: String, maxlength: 900 },
    full: { type: String, maxlength: 900 },
    width: Number,
    height: Number,
    note: { type: String, maxlength: 300 },
}, { _id: false });

const designBoardSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    title: { type: String, maxlength: 120 },
    pins: [pinSchema],
    // { width, height, background, layers: [...] } — see client DesignLab.
    canvas: { type: mongoose.Schema.Types.Mixed, default: null },
    preview: { data: { type: Buffer, select: false }, mime: { type: String, select: false } },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('DesignBoard', designBoardSchema);
