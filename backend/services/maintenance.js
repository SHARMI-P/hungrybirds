const Order = require('../models/Order');

const CHECKOUT_TTL_MS = 30 * 60 * 1000;

// Online-payment orders that never got paid are cancelled after 30 minutes
// so they don't clutter the system. A late payment is still refunded
// automatically by markOrderPaid().
const expireStaleCheckouts = async () => {
  const cutoff = new Date(Date.now() - CHECKOUT_TTL_MS);
  const result = await Order.updateMany(
    { orderStatus: 'awaiting_payment', createdAt: { $lt: cutoff } },
    {
      $set: { orderStatus: 'cancelled', cancelReason: 'Payment not completed', paymentStatus: 'failed' },
      $push: { statusHistory: { status: 'cancelled', at: new Date(), by: 'system' } },
    },
  );
  return result.modifiedCount;
};

module.exports = { expireStaleCheckouts, CHECKOUT_TTL_MS };
