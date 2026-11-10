const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../config');
const AppError = require('../utils/AppError');

let client = null;

const getClient = () => {
  if (!config.razorpayEnabled) throw AppError.unavailable('Online payments are not configured on this server');
  if (!client) client = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET });
  return client;
};

// Allows tests to inject a fake Razorpay client.
const setClient = (fake) => { client = fake; };

const toPaise = (rupees) => Math.round(rupees * 100);

const createRazorpayOrder = (amountRupees, receipt) =>
  getClient().orders.create({ amount: toPaise(amountRupees), currency: 'INR', receipt });

const safeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
};

// Signature Razorpay returns to the browser after checkout.
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, signature) => {
  if (!config.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqualHex(expected, signature);
};

// Signature on server-to-server webhook calls (X-Razorpay-Signature header).
const verifyWebhookSignature = (rawBody, signature) => {
  if (!config.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
};

const refundPayment = (paymentId, amountRupees) =>
  getClient().payments.refund(paymentId, { amount: toPaise(amountRupees), speed: 'normal' });

module.exports = {
  getClient,
  setClient,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refundPayment,
};
