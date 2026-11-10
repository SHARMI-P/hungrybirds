const express = require('express');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { z, objectId, idParams, httpUrl } = require('../utils/schemas');

const router = express.Router();

// @GET /api/menu/:restaurantId?all=true
// Customers see available items; `all=true` also returns sold-out ones (shown greyed out / for admin).
router.get(
  '/:restaurantId',
  validate({ params: z.object({ restaurantId: objectId }), query: z.object({ all: z.enum(['true', 'false']).optional() }) }),
  async (req, res) => {
    const filter = { restaurantId: req.params.restaurantId };
    if (req.validatedQuery.all !== 'true') filter.isAvailable = true;
    const items = await MenuItem.find(filter).sort({ category: 1, isBestseller: -1, name: 1 });

    const grouped = items.reduce((acc, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {});

    res.json({ items, grouped });
  },
);

const itemBody = z.object({
  restaurantId: objectId,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).default(''),
  price: z.coerce.number().positive().max(10000),
  image: httpUrl.default(''),
  category: z.string().trim().min(2).max(40),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  offer: z.string().trim().max(40).default(''),
  isBestseller: z.boolean().default(false),
});

// @POST /api/menu (admin)
router.post('/', protect, adminOnly, validate({ body: itemBody }), async (req, res) => {
  if (!(await Restaurant.exists({ _id: req.body.restaurantId }))) throw AppError.notFound('Restaurant not found');
  const item = await MenuItem.create(req.body);
  res.status(201).json(item);
});

// @PUT /api/menu/:id (admin) — partial update, e.g. { isAvailable: false } to mark sold out
router.put('/:id', protect, adminOnly, validate({ params: idParams, body: itemBody.omit({ restaurantId: true }).partial() }), async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw AppError.notFound('Menu item not found');
  res.json(item);
});

// @DELETE /api/menu/:id (admin)
router.delete('/:id', protect, adminOnly, validate({ params: idParams }), async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw AppError.notFound('Menu item not found');
  res.json({ message: 'Item deleted' });
});

module.exports = router;
