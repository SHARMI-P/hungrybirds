const mongoose = require('mongoose');

const deliveryAgentSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  phone:         { type: String, required: true, unique: true },
  email:         { type: String, required: true, unique: true },
  vehicleType:   { type: String, enum: ['bike', 'scooter', 'bicycle'], default: 'bike' },
  vehicleNumber: { type: String, default: '' },
  profileImage:  { type: String, default: '' },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  isAvailable:    { type: Boolean, default: true },
  isOnline:       { type: Boolean, default: false },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  rating:         { type: Number, default: 5.0, min: 0, max: 5 },
  totalDeliveries:{ type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DeliveryAgent', deliveryAgentSchema);
