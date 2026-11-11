const mongoose = require('mongoose');

// One-time login codes for demo mode (Twilio Verify keeps its own codes).
const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true }, // 10-digit Indian mobile
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB deletes expired codes automatically.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
