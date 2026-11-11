const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const DeliveryAgent = require('../models/DeliveryAgent');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const config = require('../config');
const { z, objectId, idParams, lat, lng, pagination } = require('../utils/schemas');
const { quoteOrder, publicQuote } = require('../services/pricing');
const payments = require('../services/payments');
const { changeStatus, agentIdForUser } = require('../services/orderLifecycle');
const { assignNearestAgent, populateOrder, releaseAgent } = require('../services/dispatch');
const { emitToAdmins, emitToAgent, emitToOrder } = require('../services/realtime');
const { ORDER_STATUSES } = require('../models/Order');
const Message = require('../models/Message');
const { validateSchedule } = require('../services/schedule');

const router = express.Router();

const cartSchema = {
  restaurantId: objectId,
  items: z
    .array(z.object({ menuItemId: objectId, quantity: z.coerce.number().int().min(1).max(50) }))
    .min(1, 'Your cart is empty')
    .max(50),
  couponCode: z.string().trim().max(30).optional(),
};

const quoteBody = z.object({ ...cartSchema, deliveryLocation: z.object({ lat, lng }).optional() });

const createBody = z.object({
  ...cartSchema,
  paymentMethod: z.enum(['razorpay', 'cod']),
  scheduledFor: z.coerce.date().optional(),
  deliveryAddress: z.object({ fullAddress: z.string().trim().min(5).max(300), lat, lng }),
});

// Owner, admin, or the rider assigned to the order may view it.
const loadOrderFor = async (orderId, user) => {
  const order = await populateOrder(Order.findById(orderId));
  if (!order) throw AppError.notFound('Order not found');
  if (user.role === 'admin' || order.userId.equals(user._id)) return order;
  if (user.role === 'agent') {
    const agentId = await agentIdForUser(user);
    if (agentId && order.deliveryAgentId?._id?.equals(agentId)) return order;
  }
  // 404 rather than 403 so order IDs can't be probed.
  throw AppError.notFound('Order not found');
};

// @POST /api/orders/quote — live bill for the cart (prices, fees, coupon, GST, ETA)
router.post('/quote', protect, validate({ body: quoteBody }), async (req, res) => {
  const quote = await quoteOrder({ ...req.body, userId: req.user._id });
  res.json(publicQuote(quote));
});

// @POST /api/orders — place an order. Totals are always recomputed on the server.
router.post('/', protect, validate({ body: createBody }), async (req, res) => {
  const { restaurantId, items, couponCode, deliveryAddress, paymentMethod } = req.body;
  const scheduledFor = validateSchedule(req.body.scheduledFor);
  const quote = await quoteOrder({
    restaurantId,
    items,
    couponCode,
    deliveryLocation: { lat: deliveryAddress.lat, lng: deliveryAddress.lng },
    userId: req.user._id,
  });

  const base = {
    userId: req.user._id,
    restaurantId: quote.restaurant._id,
    restaurantName: quote.restaurant.name,
    items: quote.items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    couponCode: quote.couponCode,
    deliveryFee: quote.deliveryFee,
    tax: quote.tax,
    finalAmount: quote.finalAmount,
    distanceKm: quote.distanceKm,
    estimatedDelivery: quote.estimatedDelivery,
    deliveryAddress,
    paymentMethod,
    scheduledFor,
    ...(scheduledFor && { estimatedDelivery: `Scheduled` }),
  };

  if (paymentMethod === 'cod') {
    const status = scheduledFor ? 'scheduled' : 'placed';
    const order = await Order.create({
      ...base,
      paymentStatus: 'pending',
      orderStatus: status,
      statusHistory: [{ status, by: 'customer' }],
    });
    emitToAdmins('new_order', { orderId: order._id, restaurantId: order.restaurantId, scheduledFor });
    if (status === 'placed') await assignNearestAgent(order._id);
    return res.status(201).json({ order: await populateOrder(Order.findById(order._id)) });
  }

  // Online payment: create the Razorpay order for the server-computed amount.
  // The order only becomes "placed" after the payment signature is verified.
  const rzpOrder = await payments.createRazorpayOrder(quote.finalAmount, `hb_${Date.now()}`);
  const order = await Order.create({
    ...base,
    paymentStatus: 'pending',
    orderStatus: 'awaiting_payment',
    razorpayOrderId: rzpOrder.id,
    statusHistory: [{ status: 'awaiting_payment', by: 'customer' }],
  });

  res.status(201).json({
    order,
    payment: { key: config.RAZORPAY_KEY_ID, orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency },
  });
});

// @GET /api/orders/my — the logged-in customer's orders (unpaid checkouts hidden)
router.get('/my', protect, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id, orderStatus: { $ne: 'awaiting_payment' } })
    .populate('restaurantId', 'name image')
    .populate('deliveryAgentId', 'name phone profileImage rating')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(orders);
});

// @GET /api/orders — all orders (admin) with status filter + pagination
router.get(
  '/',
  protect,
  adminOnly,
  validate({ query: z.object({ status: z.enum(ORDER_STATUSES).optional(), ...pagination }) }),
  async (req, res) => {
    const { status, page, limit } = req.validatedQuery;
    const filter = status ? { orderStatus: status } : { orderStatus: { $ne: 'awaiting_payment' } };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'name email phone')
        .populate('restaurantId', 'name')
        .populate('deliveryAgentId', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

// @GET /api/orders/:id
router.get('/:id', protect, validate({ params: idParams }), async (req, res) => {
  res.json(await loadOrderFor(req.params.id, req.user));
});

// @PUT /api/orders/:id/status — state machine decides who can move it where
router.put(
  '/:id/status',
  protect,
  validate({ params: idParams, body: z.object({ status: z.enum(ORDER_STATUSES), reason: z.string().trim().max(200).optional() }) }),
  async (req, res) => {
    const agentId = await agentIdForUser(req.user);
    const order = await changeStatus(
      req.params.id,
      req.body.status,
      { role: req.user.role, userId: req.user._id, agentId },
      { reason: req.body.reason },
    );
    res.json(order);
  },
);

// @POST /api/orders/:id/cancel — customer-friendly shortcut
router.post(
  '/:id/cancel',
  protect,
  validate({ params: idParams, body: z.object({ reason: z.string().trim().max(200).optional() }) }),
  async (req, res) => {
    const agentId = await agentIdForUser(req.user);
    const order = await changeStatus(
      req.params.id,
      'cancelled',
      { role: req.user.role, userId: req.user._id, agentId },
      { reason: req.body.reason || 'Cancelled by customer' },
    );
    res.json(order);
  },
);

// @PUT /api/orders/:id/assign — admin manually (re)assigns a rider
router.put(
  '/:id/assign',
  protect,
  adminOnly,
  validate({ params: idParams, body: z.object({ agentId: objectId }) }),
  async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw AppError.notFound('Order not found');
    if (!['placed', 'confirmed', 'preparing'].includes(order.orderStatus)) {
      throw AppError.badRequest('Riders can only be assigned before pickup');
    }
    if (order.deliveryAgentId?.equals(req.body.agentId)) return res.json(await populateOrder(Order.findById(order._id)));

    const agent = await DeliveryAgent.findOneAndUpdate(
      { _id: req.body.agentId, isAvailable: true },
      { isAvailable: false, currentOrderId: order._id },
      { new: true },
    );
    if (!agent) throw AppError.conflict('That rider is busy or does not exist');

    const previous = order.deliveryAgentId;
    order.deliveryAgentId = agent._id;
    await order.save();
    if (previous) await releaseAgent(previous);

    const full = await populateOrder(Order.findById(order._id));
    emitToAgent(agent._id, 'order_assigned', { orderId: order._id });
    emitToOrder(order._id, 'agent_assigned', { orderId: order._id, agent: full.deliveryAgentId });
    res.json(full);
  },
);

// @POST /api/orders/:id/review — rate a delivered order once
router.post(
  '/:id/review',
  protect,
  validate({
    params: idParams,
    body: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(500).default('') }),
  }),
  async (req, res) => {
    const { rating, comment } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, orderStatus: 'delivered', 'review.rating': { $exists: false } },
      { review: { rating, comment, createdAt: new Date() } },
      { new: true },
    );
    if (!order) {
      const exists = await Order.findOne({ _id: req.params.id, userId: req.user._id });
      if (!exists) throw AppError.notFound('Order not found');
      if (exists.review?.rating) throw AppError.conflict('You have already reviewed this order');
      throw AppError.badRequest('You can review an order after it is delivered');
    }

    // Running average, computed atomically inside MongoDB.
    await Restaurant.updateOne({ _id: order.restaurantId }, [
      {
        $set: {
          rating: {
            $round: [
              { $divide: [{ $add: [{ $multiply: ['$rating', '$totalRatings'] }, rating] }, { $add: ['$totalRatings', 1] }] },
              2,
            ],
          },
          totalRatings: { $add: ['$totalRatings', 1] },
        },
      },
    ]);
    res.status(201).json(order);
  },
);

// ───────────── Customer ↔ rider chat ─────────────

const CHAT_STATUSES = ['placed', 'confirmed', 'preparing', 'picked_up'];

// @GET /api/orders/:id/messages
router.get('/:id/messages', protect, validate({ params: idParams }), async (req, res) => {
  await loadOrderFor(req.params.id, req.user);
  const messages = await Message.find({ orderId: req.params.id }).sort({ createdAt: 1 }).limit(200);
  res.json(messages);
});

// @POST /api/orders/:id/messages — owner or assigned rider, while the order is active
router.post(
  '/:id/messages',
  protect,
  validate({ params: idParams, body: z.object({ text: z.string().trim().min(1, 'Message is empty').max(500) }) }),
  async (req, res) => {
    const order = await loadOrderFor(req.params.id, req.user);
    if (!order.deliveryAgentId) throw AppError.badRequest('Chat opens once a rider is assigned');
    if (!CHAT_STATUSES.includes(order.orderStatus)) throw AppError.badRequest('Chat is closed for this order');
    const role = req.user.role === 'agent' ? 'agent' : req.user.role === 'admin' ? 'admin' : 'customer';
    const message = await Message.create({
      orderId: order._id,
      senderId: req.user._id,
      senderRole: role,
      senderName: req.user.name.split(' ')[0],
      text: req.body.text,
    });
    emitToOrder(order._id, 'chat_message', message);
    res.status(201).json(message);
  },
);

module.exports = router;
