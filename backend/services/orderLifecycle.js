// Order state machine: which status can follow which, who may move it, and
// what happens as a side effect (freeing riders, refunds, live events).
const Order = require('../models/Order');
const DeliveryAgent = require('../models/DeliveryAgent');
const AppError = require('../utils/AppError');
const config = require('../config');
const payments = require('./payments');
const { assignNearestAgent, releaseAgent, populateOrder } = require('./dispatch');
const { emitToOrder, emitToAdmins } = require('./realtime');
const { RELEASE_BEFORE_MINS } = require('./schedule');

const TRANSITIONS = {
  awaiting_payment: ['placed', 'scheduled', 'cancelled'],
  scheduled: ['placed', 'cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['picked_up', 'cancelled'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: [],
};

const CUSTOMER_CANCELLABLE = ['awaiting_payment', 'scheduled', 'placed'];

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

/**
 * Decide whether `actor` may move `order` to `to`. Throws AppError if not.
 * actor = { role, userId, agentId? }
 */
const assertAllowed = (order, to, actor) => {
  const from = order.orderStatus;
  if (from === to) throw AppError.badRequest(`Order is already ${to.replace('_', ' ')}`);
  if (!canTransition(from, to)) {
    throw AppError.badRequest(`Cannot change order from "${from.replace('_', ' ')}" to "${to.replace('_', ' ')}"`);
  }
  // Only an admin may release a scheduled order early; otherwise "placed" is set by the system.
  if (to === 'placed' && !(from === 'scheduled' && actor.role === 'admin')) {
    throw AppError.forbidden('Orders are placed automatically once payment succeeds');
  }

  if (actor.role === 'admin') return;

  if (actor.role === 'customer') {
    const isOwner = order.userId.equals(actor.userId);
    if (!isOwner) throw AppError.notFound('Order not found');
    if (to !== 'cancelled' || !CUSTOMER_CANCELLABLE.includes(from)) {
      throw AppError.forbidden('You can only cancel an order before the restaurant confirms it');
    }
    return;
  }

  if (actor.role === 'agent') {
    const assigned = order.deliveryAgentId && actor.agentId && order.deliveryAgentId.equals(actor.agentId);
    if (!assigned) throw AppError.forbidden('This order is not assigned to you');
    if (!['picked_up', 'delivered'].includes(to)) throw AppError.forbidden('Riders can only mark orders picked up or delivered');
    return;
  }

  throw AppError.forbidden();
};

const refundIfPaid = async (order) => {
  if (order.paymentMethod !== 'razorpay' || order.paymentStatus !== 'paid' || !order.razorpayPaymentId) return order;
  try {
    const refund = await payments.refundPayment(order.razorpayPaymentId, order.finalAmount);
    return Order.findByIdAndUpdate(order._id, { paymentStatus: 'refunded', razorpayRefundId: refund.id }, { new: true });
  } catch (err) {
    if (!config.isTest) console.error('Refund failed for order', String(order._id), err?.error?.description || err.message);
    return Order.findByIdAndUpdate(order._id, { paymentStatus: 'refund_pending' }, { new: true });
  }
};

const broadcast = (order) => {
  emitToOrder(order._id, 'order_status_update', {
    orderId: order._id,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
  });
  emitToAdmins('order_updated', { orderId: order._id, status: order.orderStatus });
};

/**
 * Move an order to a new status. Uses a conditional update on the current
 * status so two concurrent requests can't both succeed.
 */
const changeStatus = async (orderId, to, actor, { reason = '' } = {}) => {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  assertAllowed(order, to, actor);

  const set = { orderStatus: to };
  if (to === 'delivered') {
    set.deliveredAt = new Date();
    if (order.paymentMethod === 'cod') set.paymentStatus = 'paid'; // cash collected
  }
  if (to === 'cancelled') set.cancelReason = reason || `Cancelled by ${actor.role}`;

  let updated = await Order.findOneAndUpdate(
    { _id: order._id, orderStatus: order.orderStatus },
    { $set: set, $push: { statusHistory: { status: to, at: new Date(), by: actor.role } } },
    { new: true },
  );
  if (!updated) throw AppError.conflict('Order was updated by someone else, please refresh');

  if (to === 'placed') await assignNearestAgent(updated._id);
  if (to === 'delivered') await releaseAgent(updated.deliveryAgentId, { delivered: true });
  if (to === 'cancelled') {
    await releaseAgent(updated.deliveryAgentId);
    updated = await refundIfPaid(updated);
  }

  broadcast(updated);
  return populateOrder(Order.findById(updated._id));
};

/**
 * Called from /payment/verify and the Razorpay webhook. Idempotent: calling it
 * twice for the same payment has no further effect.
 */
const markOrderPaid = async (order, razorpayPaymentId) => {
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') return order;

  if (order.orderStatus === 'cancelled') {
    // Paid after the customer cancelled (e.g. a late webhook) → record and refund.
    const paid = await Order.findByIdAndUpdate(order._id, { paymentStatus: 'paid', razorpayPaymentId }, { new: true });
    return refundIfPaid(paid);
  }

  const next = order.scheduledFor ? 'scheduled' : 'placed';
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, orderStatus: 'awaiting_payment' },
    {
      $set: { paymentStatus: 'paid', razorpayPaymentId, orderStatus: next },
      $push: { statusHistory: { status: next, at: new Date(), by: 'system' } },
    },
    { new: true },
  );
  if (!updated) return Order.findById(order._id);

  emitToAdmins('new_order', { orderId: updated._id, restaurantId: updated.restaurantId, scheduledFor: updated.scheduledFor });
  broadcast(updated);
  if (next === 'placed') await assignNearestAgent(updated._id);
  return Order.findById(updated._id);
};

const markPaymentFailed = (order) =>
  order.paymentStatus === 'pending'
    ? Order.findByIdAndUpdate(order._id, { paymentStatus: 'failed' }, { new: true })
    : order;

// Resolve the DeliveryAgent profile linked to an agent user.
const agentIdForUser = async (user) => {
  if (user.role !== 'agent') return null;
  const agent = await DeliveryAgent.findOne({ userId: user._id }, '_id');
  return agent?._id || null;
};

// Move scheduled orders to the kitchen when their slot is near (runs every minute).
const releaseDueScheduledOrders = async (now = new Date()) => {
  const due = await Order.find({
    orderStatus: 'scheduled',
    scheduledFor: { $lte: new Date(now.getTime() + RELEASE_BEFORE_MINS * 60 * 1000) },
  }).select('_id');
  let released = 0;
  for (const { _id } of due) {
    const order = await Order.findOneAndUpdate(
      { _id, orderStatus: 'scheduled' },
      { $set: { orderStatus: 'placed' }, $push: { statusHistory: { status: 'placed', at: new Date(), by: 'system' } } },
      { new: true },
    );
    if (!order) continue;
    released += 1;
    broadcast(order);
    emitToAdmins('new_order', { orderId: order._id, restaurantId: order.restaurantId, released: true });
    await assignNearestAgent(order._id);
  }
  return released;
};

module.exports = {
  TRANSITIONS,
  releaseDueScheduledOrders,
  canTransition,
  changeStatus,
  markOrderPaid,
  markPaymentFailed,
  agentIdForUser,
};
