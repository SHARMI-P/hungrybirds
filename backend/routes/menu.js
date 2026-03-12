const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect, adminOnly } = require('../middleware/auth');

// @GET /api/menu/:restaurantId - Get full menu for a restaurant
router.get('/:restaurantId', async (req, res) => {
  try {
    const items = await MenuItem.find({
      restaurantId: req.params.restaurantId,
      isAvailable: true,
    });

    // Group by category
    const grouped = items.reduce((acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    res.json({ items, grouped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/menu - Add menu item (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/menu/:id - Update menu item (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/menu/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
