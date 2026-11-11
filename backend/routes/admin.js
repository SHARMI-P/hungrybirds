// Dashboard analytics, computed with MongoDB aggregation pipelines.
const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const DeliveryAgent = require('../models/DeliveryAgent');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { z } = require('../utils/schemas');

const router = express.Router();

router.get(
  '/stats',
  protect,
  adminOnly,
  validate({ query: z.object({ days: z.coerce.number().int().min(1).max(90).default(14) }) }),
  async (req, res) => {
    const { days } = req.validatedQuery;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const real = { orderStatus: { $ne: 'awaiting_payment' } };
    const tz = 'Asia/Kolkata';

    const [totals, daily, statusBreakdown, topDishes, topRestaurants, users, restaurants, agents] = await Promise.all([
      Order.aggregate([
        { $match: real },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } },
            revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$finalAmount', 0] } },
            avgOrderValue: { $avg: '$finalAmount' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...real, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
            orders: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$finalAmount', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $match: real }, { $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { ...real, orderStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { ...real, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: '$restaurantName', orders: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } },
        { $sort: { orders: -1 } },
        { $limit: 5 },
      ]),
      User.countDocuments({ role: 'customer' }),
      Restaurant.countDocuments(),
      DeliveryAgent.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, online: { $sum: { $cond: ['$isOnline', 1, 0] } }, busy: { $sum: { $cond: ['$isAvailable', 0, 1] } } } },
      ]),
    ]);

    // Fill missing days with zeros so the chart has a continuous x-axis.
    const byDay = new Map(daily.map((d) => [d._id, d]));
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
      series.push({ date: key, orders: byDay.get(key)?.orders || 0, revenue: byDay.get(key)?.revenue || 0 });
    }

    const t = totals[0] || { orders: 0, delivered: 0, cancelled: 0, revenue: 0, avgOrderValue: 0 };
    res.json({
      totals: {
        orders: t.orders,
        delivered: t.delivered,
        cancelled: t.cancelled,
        revenue: Math.round(t.revenue),
        avgOrderValue: Math.round(t.avgOrderValue || 0),
        customers: users,
        restaurants,
        agents: agents[0] || { total: 0, online: 0, busy: 0 },
      },
      daily: series,
      statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
      topDishes: topDishes.map((d) => ({ name: d._id, quantity: d.quantity, revenue: d.revenue })),
      topRestaurants: topRestaurants.map((r) => ({ name: r._id, orders: r.orders, revenue: Math.round(r.revenue) })),
    });
  },
);

// @GET /api/admin/live — riders + active orders for the live map
router.get('/live', protect, adminOnly, async (req, res) => {
  const [agents, orders] = await Promise.all([
    DeliveryAgent.find({}, 'name phone vehicleType isOnline isAvailable currentOrderId location lastLocationAt'),
    Order.find({ orderStatus: { $in: ['placed', 'confirmed', 'preparing', 'picked_up'] } })
      .select('restaurantName orderStatus deliveryAddress deliveryAgentId restaurantId finalAmount createdAt')
      .populate('restaurantId', 'name location')
      .sort({ createdAt: -1 })
      .limit(200),
  ]);
  res.json({
    agents: agents
      .filter((a) => a.location?.coordinates && (a.location.coordinates[0] || a.location.coordinates[1]))
      .map((a) => ({
        _id: a._id,
        name: a.name,
        phone: a.phone,
        vehicleType: a.vehicleType,
        isOnline: a.isOnline,
        isAvailable: a.isAvailable,
        currentOrderId: a.currentOrderId,
        lat: a.location.coordinates[1],
        lng: a.location.coordinates[0],
        lastLocationAt: a.lastLocationAt,
      })),
    orders: orders.map((o) => ({
      _id: o._id,
      restaurantName: o.restaurantName,
      status: o.orderStatus,
      finalAmount: o.finalAmount,
      agentId: o.deliveryAgentId,
      restaurant: o.restaurantId?.location ? { lat: o.restaurantId.location.coordinates[1], lng: o.restaurantId.location.coordinates[0] } : null,
      home: { lat: o.deliveryAddress.lat, lng: o.deliveryAddress.lng, address: o.deliveryAddress.fullAddress },
    })),
  });
});

module.exports = router;
