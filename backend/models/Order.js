const mongoose = require('mongoose');

const ORDER_STATUSES = ['awaiting_payment', 'scheduled', 'placed', 'confirmed', 'preparing', 'picked_up', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refund_pending', 'refunded'];

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // price at time of order (from DB, never the client)
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    isVeg: { type: Boolean, default: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    restaurantName: { type: String, required: true },
    items: [orderItemSchema],

    // Bill — every number here is computed on the server.
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }, // GST
    finalAmount: { type: Number, required: true },
    distanceKm: { type: Number, default: 0 },

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], default: 'razorpay' },
    razorpayOrderId: { type: String, index: { unique: true, sparse: true } },
    razorpayPaymentId: { type: String, default: '' },
    razorpayRefundId: { type: String, default: '' },

    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'placed', index: true },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, by: String, _id: false }],
    cancelReason: { type: String, default: '' },

    deliveryAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent', default: null },
    deliveryAddress: {
      fullAddress: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    estimatedDelivery: { type: String, default: '30-45 mins' },
    scheduledFor: { type: Date, default: null, index: true }, // "deliver at 1 pm" orders
    deliveredAt: { type: Date },

    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      createdAt: { type: Date },
    },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
