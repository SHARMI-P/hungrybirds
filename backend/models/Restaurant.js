const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' }, // Cloudinary URL
    cuisine: [{ type: String, trim: true }], // e.g. ['South Indian', 'Chinese']
    address: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    deliveryTime: { type: String, default: '30-45 mins' },
    prepTimeMins: { type: Number, default: 15 }, // used for the ETA calculation
    deliveryFee: { type: Number, default: 30 }, // base fee; distance surcharge added on top
    minimumOrder: { type: Number, default: 100 },
    pureVeg: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    offers: [{ type: String }], // marketing text, e.g. 'Use HUNGRY20 for 20% off'
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Geo index for location-based search.
restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
