const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { z, idParams, lat, lng, httpUrl, pagination } = require('../utils/schemas');

const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const nearbyQuery = z.object({
  lat,
  lng,
  radius: z.coerce.number().min(500).max(50000).default(10000), // metres
  q: z.string().trim().max(60).optional(),
  cuisine: z.string().trim().max(40).optional(),
  veg: bool.optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  openOnly: bool.default(true),
  sort: z.enum(['distance', 'rating', 'deliveryFee']).default('distance'),
});

// @GET /api/restaurants/nearby?lat&lng&radius&q&cuisine&veg&minRating&sort
router.get('/nearby', validate({ query: nearbyQuery }), async (req, res) => {
  const { lat: la, lng: ln, radius, q, cuisine, veg, minRating, openOnly, sort } = req.validatedQuery;

  const match = {};
  if (openOnly) match.isOpen = true;
  if (veg) match.pureVeg = true;
  if (minRating) match.rating = { $gte: minRating };
  if (cuisine) match.cuisine = { $regex: `^${escapeRegex(cuisine)}$`, $options: 'i' };
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    match.$or = [{ name: rx }, { cuisine: rx }];
  }

  const sortStage = { distance: { distanceM: 1 }, rating: { rating: -1, distanceM: 1 }, deliveryFee: { deliveryFee: 1, distanceM: 1 } }[sort];

  const restaurants = await Restaurant.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [ln, la] },
        distanceField: 'distanceM',
        maxDistance: radius,
        spherical: true,
        query: match,
      },
    },
    { $sort: sortStage },
    { $limit: 50 },
    { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceM', 1000] }, 1] } } },
    { $project: { distanceM: 0 } },
  ]);
  res.json(restaurants);
});

// @GET /api/restaurants — all restaurants (used by admin and as a fallback list)
router.get(
  '/',
  validate({ query: z.object({ q: z.string().trim().max(60).optional(), ...pagination, limit: pagination.limit.default(100) }) }),
  async (req, res) => {
    const { q, page, limit } = req.validatedQuery;
    const filter = q ? { name: { $regex: escapeRegex(q), $options: 'i' } } : {};
    const restaurants = await Restaurant.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit);
    res.json(restaurants);
  },
);

// @GET /api/restaurants/cuisines — distinct list for filter chips
router.get('/cuisines', async (req, res) => {
  const cuisines = await Restaurant.distinct('cuisine');
  res.json(cuisines.sort());
});

// @GET /api/restaurants/:id
router.get('/:id', validate({ params: idParams }), async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  res.json(restaurant);
});

// @GET /api/restaurants/:id/reviews
router.get('/:id/reviews', validate({ params: idParams }), async (req, res) => {
  const orders = await Order.find({ restaurantId: req.params.id, 'review.rating': { $exists: true } })
    .sort({ 'review.createdAt': -1 })
    .limit(20)
    .populate('userId', 'name')
    .select('review userId');
  res.json(
    orders.map((o) => ({
      _id: o._id,
      rating: o.review.rating,
      comment: o.review.comment,
      createdAt: o.review.createdAt,
      userName: o.userId?.name?.split(' ')[0] || 'Customer',
    })),
  );
});

// Whitelisted fields only — prevents mass assignment of rating, ownerId, etc.
const restaurantBody = z.object({
  name: z.string().trim().min(2).max(100),
  image: httpUrl.default(''),
  cuisine: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
  address: z.string().trim().min(5).max(300),
  lat,
  lng,
  deliveryTime: z.string().trim().max(30).default('30-45 mins'),
  prepTimeMins: z.coerce.number().int().min(5).max(120).default(15),
  deliveryFee: z.coerce.number().min(0).max(500).default(30),
  minimumOrder: z.coerce.number().min(0).max(5000).default(100),
  pureVeg: z.boolean().default(false),
  isOpen: z.boolean().default(true),
  offers: z.array(z.string().trim().max(80)).max(5).default([]),
});

const toDoc = ({ lat: la, lng: ln, ...rest }) => ({
  ...rest,
  ...(la !== undefined && ln !== undefined && { location: { type: 'Point', coordinates: [ln, la] } }),
});

// @POST /api/restaurants (admin)
router.post('/', protect, adminOnly, validate({ body: restaurantBody }), async (req, res) => {
  const restaurant = await Restaurant.create({ ...toDoc(req.body), ownerId: req.user._id });
  res.status(201).json(restaurant);
});

// @PUT /api/restaurants/:id (admin) — partial update
const updateBody = restaurantBody
  .partial()
  .refine((b) => (b.lat === undefined) === (b.lng === undefined), { message: 'lat and lng must be sent together' });

router.put('/:id', protect, adminOnly, validate({ params: idParams, body: updateBody }), async (req, res) => {
  const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, toDoc(req.body), { new: true, runValidators: true });
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  res.json(restaurant);
});

// @DELETE /api/restaurants/:id (admin) — also removes its menu
router.delete('/:id', protect, adminOnly, validate({ params: idParams }), async (req, res) => {
  const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  await MenuItem.deleteMany({ restaurantId: restaurant._id });
  res.json({ message: 'Restaurant deleted' });
});

module.exports = router;
