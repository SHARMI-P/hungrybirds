const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 0 }, // % or ₹
    maxDiscount: { type: Number, default: 0 }, // 0 = no cap (percent coupons)
    minOrder: { type: Number, default: 0 },
    firstOrderOnly: { type: Boolean, default: false },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null }, // null = all
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Coupon', couponSchema);
