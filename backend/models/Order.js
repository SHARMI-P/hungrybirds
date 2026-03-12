const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId:  { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  image:       { type: String, default: '' },
});

const orderSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  restaurantName: { type: String, required: true },
  items:          [orderItemSchema],
  subtotal:       { type: Number, required: true },
  deliveryFee:    { type: Number, default: 30 },
  discount:       { type: Number, default: 0 },
  finalAmount:    { type: Number, required: true },
  paymentStatus:  { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod:  { type: String, enum: ['razorpay', 'cod'], default: 'razorpay' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'picked_up', 'delivered', 'cancelled'],
    default: 'placed',
  },
  deliveryAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent', default: null },
  deliveryAddress: {
    fullAddress: { type: String, required: true },
    lat:         { type: Number, required: true },
    lng:         { type: Number, required: true },
  },
  estimatedDelivery: { type: String, default: '30-45 mins' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
