const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const DeliveryAgent = require('../models/DeliveryAgent');
const { protect, adminOnly } = require('../middleware/auth');

// @POST /api/orders - Place a new order
router.post('/', protect, async (req, res) => {
  try {
    const {
      restaurantId, restaurantName, items,
      subtotal, deliveryFee, discount, finalAmount,
      paymentMethod, razorpayOrderId, razorpayPaymentId,
      deliveryAddress,
    } = req.body;

    // Auto-assign nearest available delivery agent
    const agent = await DeliveryAgent.findOne({ isAvailable: true, isOnline: true });

    const order = await Order.create({
      userId:         req.user._id,
      restaurantId,   restaurantName, items,
      subtotal,       deliveryFee, discount, finalAmount,
      paymentStatus:  paymentMethod === 'cod' ? 'pending' : 'paid',
      paymentMethod,  razorpayOrderId, razorpayPaymentId,
      orderStatus:    'placed',
      deliveryAgentId: agent ? agent._id : null,
      deliveryAddress,
    });

    // Mark agent as unavailable
    if (agent) {
      await DeliveryAgent.findByIdAndUpdate(agent._id, {
        isAvailable:    false,
        currentOrderId: order._id,
      });
    }

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('new_order', { orderId: order._id, restaurantId });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/orders/my - Get logged in user's orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('restaurantId', 'name image')
      .populate('deliveryAgentId', 'name phone profileImage rating')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/orders/:id - Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name image address')
      .populate('deliveryAgentId', 'name phone profileImage rating vehicleNumber currentLocation');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/orders/:id/status - Update order status (admin/agent)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    // If delivered, free up the agent
    if (status === 'delivered' && order.deliveryAgentId) {
      await DeliveryAgent.findByIdAndUpdate(order.deliveryAgentId, {
        isAvailable:    true,
        currentOrderId: null,
      });
    }

    // Emit real-time status update
    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order_status_update', { status, orderId: order._id });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/orders - All orders (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('userId', 'name email phone')
      .populate('restaurantId', 'name')
      .populate('deliveryAgentId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
