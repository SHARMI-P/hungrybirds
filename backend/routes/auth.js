const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { PHONE_EMAIL_DOMAIN } = require('../models/User');
const { normalizePhone, sendOtp, checkOtp } = require('../services/otp');
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

// ───────────── Favourite restaurants ─────────────

router.get('/favorites', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites');
  res.json(user.favorites.filter(Boolean));
});

router.post('/favorites/:restaurantId', protect, validate({ params: z.object({ restaurantId: objectId }) }), async (req, res) => {
  if (!(await Restaurant.exists({ _id: req.params.restaurantId }))) throw AppError.notFound('Restaurant not found');
  const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: req.params.restaurantId } }, { new: true });
  res.json(user.favorites);
});

router.delete('/favorites/:restaurantId', protect, validate({ params: z.object({ restaurantId: objectId }) }), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: req.params.restaurantId } }, { new: true });
  res.json(user.favorites);
});

// ───────────── Phone OTP login ─────────────

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 1000 : 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many OTP requests, please try again later' },
});

const otpEnabled = (req, res, next) => (config.OTP_PROVIDER === 'off' ? next(AppError.notFound('Phone login is not enabled')) : next());

// Which accounts share this number (stored formats vary: 98…, +9198…, 9198…)
const usersWithPhone = (phone) => User.find({ phone: { $in: [phone, `+91${phone}`, `91${phone}`, `+91 ${phone}`] } });

router.get('/otp/config', (req, res) => res.json({ enabled: config.OTP_PROVIDER !== 'off', demo: config.OTP_PROVIDER === 'demo' }));

router.post('/otp/send', otpEnabled, otpLimiter, validate({ body: z.object({ phone: z.string().max(20) }) }), async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const result = await sendOtp(phone);
  res.json({ sent: true, ...(config.OTP_PROVIDER === 'demo' && { demoCode: result.devCode }) });
});

router.post(
  '/otp/verify',
  otpEnabled,
  authLimiter,
  validate({ body: z.object({ phone: z.string().max(20), code: z.string().trim().regex(/^\d{4,8}$/, 'Enter the code from the SMS') }) }),
  async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    await checkOtp(phone, req.body.code);
    const users = (await usersWithPhone(phone)).filter((u) => u.role !== 'admin'); // admins must use their password
    if (users.length > 1) throw AppError.conflict('More than one account uses this number — please log in with email');
    if (users.length === 1) return res.json(authResponse(users[0]));
    // New number: ask for a name, using a short-lived token that proves the phone was verified.
    const signupToken = jwt.sign({ purpose: 'phone-signup', phone }, config.JWT_SECRET, { expiresIn: '10m' });
    res.json({ needsName: true, signupToken });
  },
);

router.post(
  '/otp/complete',
  otpEnabled,
  validate({ body: z.object({ signupToken: z.string().min(10), name: z.string().trim().min(2, 'Name is too short').max(80) }) }),
  async (req, res) => {
    let payload;
    try {
      payload = jwt.verify(req.body.signupToken, config.JWT_SECRET);
    } catch {
      throw AppError.badRequest('Verification expired — please request a new code');
    }
    if (payload.purpose !== 'phone-signup') throw AppError.badRequest('Invalid signup token');
    const existing = await usersWithPhone(payload.phone);
    if (existing.length) return res.json(authResponse(existing[0]));
    const user = await User.create({
      name: req.body.name,
      phone: payload.phone,
      email: `${payload.phone}${PHONE_EMAIL_DOMAIN}`,
      password: crypto.randomBytes(24).toString('hex'), // not used; this account signs in with OTP
      role: 'customer',
    });
    res.status(201).json(authResponse(user));
  },
);

module.exports = router;
