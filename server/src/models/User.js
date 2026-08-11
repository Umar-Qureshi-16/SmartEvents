const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'organizer', 'vendor'], 
        default: 'organizer' 
    },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    vendorProfile: {
        category: { type: String, default: 'Catering' },
        bio: { type: String, default: '' },
        portfolio: [{ type: String }],
        rating: { type: Number, default: 5.0 },
        totalReviews: { type: Number, default: 0 },
        location: { type: String, default: '' }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
