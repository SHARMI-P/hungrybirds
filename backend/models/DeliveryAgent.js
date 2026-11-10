const mongoose = require('mongoose');

const deliveryAgentSchema = new mongoose.Schema(
  {
    // The login account for this rider (role: 'agent').
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle'], default: 'bike' },
    vehicleNumber: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    // GeoJSON so we can find the nearest rider with $near.
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    lastLocationAt: { type: Date },
    isAvailable: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    totalDeliveries: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

deliveryAgentSchema.index({ location: '2dsphere' });

// Backwards-compatible { lat, lng } shape for the frontend.
deliveryAgentSchema.virtual('currentLocation').get(function currentLocation() {
  const [lng, lat] = this.location?.coordinates || [0, 0];
  return { lat, lng };
});

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema);
