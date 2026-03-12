const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name:         { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  price:        { type: Number, required: true },
  image:        { type: String, default: '' },   // Cloudinary URL
  category:     { type: String, required: true }, // e.g. 'Starters', 'Main Course', 'Desserts'
  isVeg:        { type: Boolean, default: true },
  isAvailable:  { type: Boolean, default: true },
  offer:        { type: String, default: '' },    // e.g. '10% off'
  isBestseller: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
