const express = require('express');
const DeliveryAgent = require('../models/DeliveryAgent');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, adminOnly, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { z, idParams, lat, lng, httpUrl } = require('../utils/schemas');
const { findWorkForAgent } = require('../services/dispatch');
const { emitToOrder, emitToAdmins } = require('../services/realtime');

const router = express.Router();

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const agentBody = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, 'Rider password must be at least 8 characters').max(128),
  vehicleType: z.enum(['bike', 'scooter', 'bicycle']).default('bike'),
  vehicleNumber: z.string().trim().max(20).default(''),
  profileImage: httpUrl.default(''),
});

// ───────────── Rider (role: agent) self-service ─────────────

const loadSelf = async (req) => {
  const agent = await DeliveryAgent.findOne({ userId: req.user._id });
  if (!agent) throw AppError.notFound('No rider profile linked to this account');
  return agent;
};

// @GET /api/agents/me — rider profile + the order they're delivering
router.get('/me', protect, requireRole('agent'), async (req, res) => {
  const agent = await loadSelf(req);
  const currentOrder = agent.currentOrderId
    ? await Order.findById(agent.currentOrderId)
      .populate('restaurantId', 'name address location image')
      .populate('userId', 'name phone')
    : null;
  res.json({ agent, currentOrder });
});

// @PUT /api/agents/me/status — go online/offline
router.put('/me/status', protect, requireRole('agent'), validate({ body: z.object({ isOnline: z.boolean() }) }), async (req, res) => {
  const agent = await loadSelf(req);
  if (!req.body.isOnline && agent.currentOrderId) throw AppError.badRequest('Finish your current delivery before going offline');
  agent.isOnline = req.body.isOnline;
  await agent.save();
  if (agent.isOnline) await findWorkForAgent(agent._id);
  emitToAdmins('agent_updated', { agentId: agent._id });
  res.json(await DeliveryAgent.findById(agent._id));
});

// @PUT /api/agents/me/location — rider GPS ping; forwarded live to the customer
router.put('/me/location', protect, requireRole('agent'), validate({ body: z.object({ lat, lng }) }), async (req, res) => {
  const agent = await loadSelf(req);
  agent.location = { type: 'Point', coordinates: [req.body.lng, req.body.lat] };
  agent.lastLocationAt = new Date();
  await agent.save();
  emitToAdmins('agent_location', { agentId: agent._id, lat: req.body.lat, lng: req.body.lng, at: agent.lastLocationAt });
  if (agent.currentOrderId) {
    emitToOrder(agent.currentOrderId, 'location_update', { lat: req.body.lat, lng: req.body.lng, at: agent.lastLocationAt });
  } else if (agent.isOnline) {
    await findWorkForAgent(agent._id);
  }
  res.json({ success: true });
});

// ───────────── Admin management ─────────────

// @GET /api/agents
router.get('/', protect, adminOnly, async (req, res) => {
  const agents = await DeliveryAgent.find({}).populate('currentOrderId', 'orderStatus restaurantName').sort({ name: 1 });
  res.json(agents);
});

// @POST /api/agents — creates the rider profile AND their login (role: agent)
router.post('/', protect, adminOnly, validate({ body: agentBody }), async (req, res) => {
  const { password, ...profile } = req.body;
  if (await User.exists({ email: profile.email })) throw AppError.conflict('A user with this email already exists');

  const user = await User.create({ name: profile.name, email: profile.email, phone: profile.phone, password, role: 'agent' });
  try {
    const agent = await DeliveryAgent.create({ ...profile, userId: user._id, isOnline: false, isAvailable: true });
    res.status(201).json(agent);
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // keep data consistent
    throw err;
  }
});

// @PUT /api/agents/:id — edit profile / toggle online
router.put(
  '/:id',
  protect,
  adminOnly,
  validate({ params: idParams, body: agentBody.omit({ password: true, email: true }).partial().extend({ isOnline: z.boolean().optional() }) }),
  async (req, res) => {
    const agent = await DeliveryAgent.findById(req.params.id);
    if (!agent) throw AppError.notFound('Agent not found');
    if (req.body.isOnline === false && agent.currentOrderId) throw AppError.badRequest('This rider is on a delivery');
    Object.assign(agent, req.body);
    await agent.save();
    if (agent.isOnline) await findWorkForAgent(agent._id);
    res.json(await DeliveryAgent.findById(agent._id));
  },
);

// @DELETE /api/agents/:id
router.delete('/:id', protect, adminOnly, validate({ params: idParams }), async (req, res) => {
  const agent = await DeliveryAgent.findById(req.params.id);
  if (!agent) throw AppError.notFound('Agent not found');
  if (agent.currentOrderId) throw AppError.badRequest('This rider is on a delivery and cannot be removed now');
  await agent.deleteOne();
  if (agent.userId) await User.deleteOne({ _id: agent.userId, role: 'agent' });
  res.json({ message: 'Agent deleted' });
});

module.exports = router;
