const mongoose = require('mongoose');

// Small key/value store for settings a super admin can change at runtime.
// Secrets are stored hashed, never in plain text.
const platformSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
