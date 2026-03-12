const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const { protect, adminOnly } = require('../middleware/auth');

// @GET /api/restaurants/nearby?lat=xx&lng=xx&radius=5000
// Get restaurants near user location (radius in meters, default 5km)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const restaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
      isOpen: true,
    }).limit(20);

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/restaurants - Get all restaurants (admin)
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({});
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/restaurants - Create restaurant (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, image, cuisine, address, lat, lng, deliveryTime, deliveryFee, minimumOrder, offers } = req.body;

    const restaurant = await Restaurant.create({
      name, image, cuisine, address,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      deliveryTime, deliveryFee, minimumOrder, offers,
      ownerId: req.user._id,
    });

    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/restaurants/:id - Update restaurant (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/restaurants/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Restaurant deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
