const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: ['venue', 'catering', 'decoration', 'photography', 'music', 'makeup'], required: true },
    location: { type: String, required: true }, // Used for location-based exposure
    portfolioImages: [{ type: String }], // URLs to images/videos
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    isBoosted: { type: Boolean, default: false }, // For top vendor exposure
    earnings: { type: Number, default: 0 }, // For analytics
    packages: [{
        title: { type: String },
        price: { type: Number },
        description: { type: String },
        includes: [{ type: String }]
    }],
    blockedDates: [{ type: Date }]
}, { timestamps: true });

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
