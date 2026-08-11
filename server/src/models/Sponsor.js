const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    logo: { type: String, required: true },
    website: { type: String, default: '' },
    tier: {
        type: String,
        enum: ['Title', 'Platinum', 'Gold', 'Silver', 'Bronze'],
        default: 'Gold'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sponsor', sponsorSchema);
