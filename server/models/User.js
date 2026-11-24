const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { 
    type: String, 
    select: false, 
    required: function() { return !this.googleId; } 
  },
  googleId: { type: String, sparse: true, unique: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  role: { type: String, enum: ['customer', 'provider', 'admin', 'superadmin'], default: 'customer' },
  trustScore: { type: Number, default: 100 }, // Scaling 0-100
  analytics: {
    totalBookings: { type: Number, default: 0 },
    completedEvents: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5.0 }
  },
  status: { type: String, enum: ['active', 'restricted', 'banned'], default: 'active' },
  businessDetails: {
    companyName: String,
    portfolio: [String],
    verified: { type: Boolean, default: false }
  },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Devices of the mobile app that receive push notifications (Firebase).
  pushTokens: {
    type: [{ token: String, platform: String, updatedAt: Date }],
    select: false,
    default: undefined,
  },
  // Where the user is: sets the currency prices are shown in and the culture
  // Smartie designs for. Defaults to Pakistan.
  locale: {
    country: { type: String, default: 'PK', maxlength: 2 },
    region: { type: String, maxlength: 60 },
  },
  // Organizer profile (vendors keep theirs in VendorProfile).
  profile: {
    bio: { type: String, maxlength: 600 },
    city: { type: String, maxlength: 80 },
    avatar: { type: String },
    coverImage: { type: String },
    interests: [{ type: String, maxlength: 40 }],
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
