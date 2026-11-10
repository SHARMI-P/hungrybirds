const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect, signToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const AppError = require('../utils/AppError');
const config = require('../config');
const { z, lat, lng, objectId } = require('../utils/schemas');

const router = express.Router();

// Slow down password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a few minutes' },
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91[-\s]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

const addressSchema = z.object({
  label: z.string().trim().max(30).default('Home'),
  fullAddress: z.string().trim().min(5, 'Address is too short').max(300),
  lat,
  lng,
});

const authResponse = (user) => ({ ...user.toPublic(), token: signToken(user) });

// @POST /api/auth/register — always creates a customer; role can't be chosen by the client.
router.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.exists({ email })) throw AppError.conflict('Email already registered');
  const user = await User.create({ name, email, phone, password, role: 'customer' });
  res.status(201).json(authResponse(user));
});

// @POST /api/auth/login
router.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw AppError.unauthorized('Invalid email or password');
  res.json(authResponse(user));
});

// @GET /api/auth/me (alias: /profile)
router.get(['/me', '/profile'], protect, (req, res) => res.json(req.user.toPublic()));

// Saved addresses
router.get('/addresses', protect, (req, res) => res.json(req.user.addresses));

router.post('/addresses', protect, validate({ body: addressSchema }), async (req, res) => {
  if (req.user.addresses.length >= 10) throw AppError.badRequest('You can save up to 10 addresses');
  req.user.addresses.push(req.body);
  await req.user.save();
  res.status(201).json(req.user.addresses);
});

router.delete('/addresses/:addressId', protect, validate({ params: z.object({ addressId: objectId }) }), async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw AppError.notFound('Address not found');
  address.deleteOne();
  await req.user.save();
  res.json(req.user.addresses);
});

module.exports = router;
