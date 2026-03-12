const express = require('express');
const router = express.Router();
const DeliveryAgent = require('../models/DeliveryAgent');
const { protect, adminOnly } = require('../middleware/auth');

// @GET /api/agents - Get all agents (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const agents = await DeliveryAgent.find({}).populate('currentOrderId', 'orderStatus');
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/agents - Add new agent (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const agent = await DeliveryAgent.create(req.body);
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/agents/:id - Update agent (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const agent = await DeliveryAgent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/agents/:id/location - Agent updates their own location
router.put('/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await DeliveryAgent.findByIdAndUpdate(req.params.id, {
      currentLocation: { lat, lng }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/agents/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await DeliveryAgent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Agent deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
