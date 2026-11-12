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
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
