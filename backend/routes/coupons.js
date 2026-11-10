const express = require('express');
const Coupon = require('../models/Coupon');
const { protect, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const { z, objectId, idParams } = require('../utils/schemas');

const router = express.Router();

// @GET /api/coupons — active coupons customers can apply (optionally for one restaurant)
router.get('/', validate({ query: z.object({ restaurantId: objectId.optional() }) }), async (req, res) => {
  const { restaurantId } = req.validatedQuery;
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ restaurantId: null }, ...(restaurantId ? [{ restaurantId }] : [])] },
    ],
  })
    .select('code description type value maxDiscount minOrder firstOrderOnly restaurantId')
    .sort({ minOrder: 1 });
  res.json(coupons);
});

const couponBody = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'Use 3–20 letters/numbers'),
    description: z.string().trim().max(120).default(''),
    type: z.enum(['percent', 'flat']),
    value: z.coerce.number().positive(),
    maxDiscount: z.coerce.number().min(0).default(0),
    minOrder: z.coerce.number().min(0).default(0),
    firstOrderOnly: z.boolean().default(false),
    restaurantId: objectId.nullable().default(null),
    expiresAt: z.coerce.date().nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'Percent discount cannot exceed 100', path: ['value'] });

// Admin
router.get('/all', protect, adminOnly, async (req, res) => res.json(await Coupon.find().sort({ createdAt: -1 })));

router.post('/', protect, adminOnly, validate({ body: couponBody }), async (req, res) => {
  res.status(201).json(await Coupon.create(req.body));
});

router.put('/:id', protect, adminOnly, validate({ params: idParams, body: z.object({ isActive: z.boolean() }) }), async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) throw AppError.notFound('Coupon not found');
  res.json(coupon);
});

router.delete('/:id', protect, adminOnly, validate({ params: idParams }), async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw AppError.notFound('Coupon not found');
  res.json({ message: 'Coupon deleted' });
});

module.exports = router;
