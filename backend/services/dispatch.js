// Delivery-agent assignment. Uses $near on the agents' GeoJSON location and an
// atomic "claim" update so two orders can never grab the same rider.
const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { emitToAgent, emitToOrder, emitToAdmins } = require('./realtime');
const { haversineKm, fromPoint } = require('./geo');

const SEARCH_RADIUS_M = 20000;
const ASSIGNABLE_STATUSES = ['placed', 'confirmed', 'preparing'];

const populateOrder = (query) =>
  query
    .populate('restaurantId', 'name image address location')
    .populate('deliveryAgentId', 'name phone profileImage rating vehicleNumber vehicleType location');

// Try to claim a specific agent for a specific order. Returns the updated order or null.
const claim = async (agentId, orderId) => {
  const agent = await DeliveryAgent.findOneAndUpdate(
    { _id: agentId, isAvailable: true, isOnline: true },
    { isAvailable: false, currentOrderId: orderId },
    { new: true },
  );
  if (!agent) return null;

  const order = await Order.findOneAndUpdate(
    { _id: orderId, deliveryAgentId: null, orderStatus: { $in: ASSIGNABLE_STATUSES } },
    { deliveryAgentId: agent._id },
    { new: true },
  );
  if (!order) {
    // The order was assigned/cancelled meanwhile — release the rider.
    await DeliveryAgent.updateOne({ _id: agent._id }, { isAvailable: true, currentOrderId: null });
    return null;
  }

  const full = await populateOrder(Order.findById(order._id));
  emitToAgent(agent._id, 'order_assigned', { orderId: order._id });
  emitToOrder(order._id, 'agent_assigned', { orderId: order._id, agent: full.deliveryAgentId });
  emitToAdmins('order_updated', { orderId: order._id });
  return full;
};

// Find the nearest online, free rider for an order.
const assignNearestAgent = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order || order.deliveryAgentId || !ASSIGNABLE_STATUSES.includes(order.orderStatus)) return order;
  const restaurant = await Restaurant.findById(order.restaurantId, 'location');
  if (!restaurant) return order;

  const candidates = await DeliveryAgent.find(
    {
      isOnline: true,
      isAvailable: true,
      location: { $near: { $geometry: restaurant.location, $maxDistance: SEARCH_RADIUS_M } },
    },
    '_id',
  ).limit(5);

  for (const candidate of candidates) {
    const assigned = await claim(candidate._id, order._id);
    if (assigned) return assigned;
  }
  return order; // nobody free right now — picked up later by findWorkForAgent
};

// When a rider comes online or finishes a delivery, give them the oldest waiting order nearby.
const findWorkForAgent = async (agentId) => {
  const agent = await DeliveryAgent.findById(agentId);
  if (!agent || !agent.isOnline || !agent.isAvailable) return null;
  const here = fromPoint(agent.location);

  const waiting = await Order.find({ deliveryAgentId: null, orderStatus: { $in: ASSIGNABLE_STATUSES } })
    .sort({ createdAt: 1 })
    .limit(20)
    .populate('restaurantId', 'location');

  for (const order of waiting) {
    if (!order.restaurantId?.location) continue;
    const km = haversineKm(here, fromPoint(order.restaurantId.location));
    if (km * 1000 > SEARCH_RADIUS_M) continue;
    const assigned = await claim(agent._id, order._id);
    if (assigned) return assigned;
  }
  return null;
};

const releaseAgent = async (agentId, { delivered = false } = {}) => {
  if (!agentId) return;
  await DeliveryAgent.updateOne(
    { _id: agentId },
    { isAvailable: true, currentOrderId: null, ...(delivered && { $inc: { totalDeliveries: 1 } }) },
  );
  await findWorkForAgent(agentId);
};

module.exports = { assignNearestAgent, findWorkForAgent, releaseAgent, populateOrder, ASSIGNABLE_STATUSES };
