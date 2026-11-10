const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const config = require('../config');
const { z, objectId } = require('../utils/schemas');
const payments = require('../services/payments');
const { markOrderPaid, markPaymentFailed } = require('../services/orderLifecycle');
const { populateOrder } = require('../services/dispatch');

const router = express.Router();

// @GET /api/payment/config — lets the frontend know whether online payment is available
router.get('/config', (req, res) => {
  res.json({ razorpayEnabled: config.razorpayEnabled, key: config.razorpayEnabled ? config.RAZORPAY_KEY_ID : null });
});

// @POST /api/payment/verify — called by the browser after Razorpay checkout succeeds.
// Verifies the HMAC signature AND that the payment belongs to this user's order.
router.post(
  '/verify',
  protect,
  validate({
    body: z.object({
      orderId: objectId,
      razorpay_order_id: z.string().min(1),
      razorpay_payment_id: z.string().min(1),
      razorpay_signature: z.string().min(1),
    }),
  }),
  async (req, res) => {
    const { orderId, razorpay_order_id: rzpOrderId, razorpay_payment_id: rzpPaymentId, razorpay_signature: signature } = req.body;

    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (!order) throw AppError.notFound('Order not found');
    if (order.razorpayOrderId !== rzpOrderId) throw AppError.badRequest('Payment does not match this order');
    if (!payments.verifyPaymentSignature(rzpOrderId, rzpPaymentId, signature)) {
      await markPaymentFailed(order);
      throw AppError.badRequest('Payment verification failed');
    }

    const updated = await markOrderPaid(order, rzpPaymentId);
    res.json({ success: true, order: await populateOrder(Order.findById(updated._id)) });
  },
);

// @POST /api/payment/webhook — server-to-server confirmation from Razorpay.
// Makes payment status correct even if the customer closes the tab before /verify runs.
// Mounted with express.raw() in app.js because the signature is over the raw body.
const webhook = async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!payments.verifyWebhookSignature(raw, signature)) throw AppError.badRequest('Invalid webhook signature');

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    throw AppError.badRequest('Malformed webhook body');
  }

  const payment = event?.payload?.payment?.entity;
  const rzpOrderId = payment?.order_id || event?.payload?.order?.entity?.id;
  if (!rzpOrderId) return res.json({ ok: true, ignored: true });

  const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
  if (!order) return res.json({ ok: true, ignored: true });

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    if (payment && payment.amount !== Math.round(order.finalAmount * 100)) {
      throw AppError.badRequest('Paid amount does not match order total');
    }
    await markOrderPaid(order, payment?.id || order.razorpayPaymentId);
  } else if (event.event === 'payment.failed') {
    await markPaymentFailed(order);
  }
  res.json({ ok: true });
};

module.exports = router;
module.exports.webhook = webhook;
