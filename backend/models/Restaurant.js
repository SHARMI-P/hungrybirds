const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  image:        { type: String, default: '' },          // Cloudinary URL
  cuisine:      [{ type: String }],                     // e.g. ['South Indian', 'Chinese']
  address:      { type: String, required: true },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },    // [lng, lat]
  },
  rating:        { type: Number, default: 0, min: 0, max: 5 },
  totalRatings:  { type: Number, default: 0 },
  deliveryTime:  { type: String, default: '30-45 mins' },
  deliveryFee:   { type: Number, default: 30 },
  minimumOrder:  { type: Number, default: 100 },
  isOpen:        { type: Boolean, default: true },
  offers:        [{ type: String }],                    // e.g. ['20% off above ₹300']
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for geo queries (VERY IMPORTANT for location-based search)
restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
