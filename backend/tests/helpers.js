const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const payments = require('../services/payments');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const DeliveryAgent = require('../models/DeliveryAgent');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

const api = () => request(app);

const connect = async () => {
  // A separate database per test file so files can't interfere with each other.
  const name = `hb_test_${process.env.JEST_WORKER_ID}_${Date.now()}`;
  await mongoose.connect(process.env.MONGODB_URI.replace(/\/[^/]*$/, `/${name}`));
  await Promise.all([User, Restaurant, MenuItem, DeliveryAgent, Coupon, Order].map((m) => m.init()));
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

const clear = async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

let seq = 0;
const createUser = async (overrides = {}) => {
  seq += 1;
  const password = overrides.password || 'Password@123';
  const user = await User.create({
    name: `User ${seq}`,
    email: `user${seq}@test.com`,
    phone: `98765${String(10000 + seq).slice(-5)}`,
    role: 'customer',
    ...overrides,
    password,
  });
  const res = await api().post('/api/auth/login').send({ email: user.email, password });
  return { user, token: res.body.token };
};

const createAgent = async ({ lat, lng, name = 'Rider', isOnline = true } = {}) => {
  const { user, token } = await createUser({ role: 'agent', name });
  const agent = await DeliveryAgent.create({
    userId: user._id,
    name,
    phone: user.phone,
    email: user.email,
    isOnline,
    isAvailable: true,
    location: { type: 'Point', coordinates: [lng, lat] },
  });
  return { user, token, agent };
};

// A restaurant in Dharwad with a small menu.
const DHARWAD = { lat: 15.4589, lng: 75.0078 };
const createRestaurant = async (overrides = {}) => {
  const restaurant = await Restaurant.create({
    name: 'Test Bhavan',
    cuisine: ['South Indian'],
    address: 'Station Road, Dharwad',
    location: { type: 'Point', coordinates: [DHARWAD.lng, DHARWAD.lat] },
    deliveryFee: 20,
    minimumOrder: 100,
    prepTimeMins: 15,
    pureVeg: true,
    ...overrides,
  });
  const [dosa, coffee, soldOut] = await MenuItem.create([
    { restaurantId: restaurant._id, name: 'Masala Dosa', price: 60, category: 'Tiffin' },
    { restaurantId: restaurant._id, name: 'Filter Coffee', price: 30, category: 'Drinks' },
    { restaurantId: restaurant._id, name: 'Kesari Bath', price: 50, category: 'Sweets', isAvailable: false },
  ]);
  return { restaurant, dosa, coffee, soldOut };
};

// ~1 km from the restaurant
const NEARBY_ADDRESS = { fullAddress: '12 Malmaddi, Dharwad', lat: 15.4500, lng: 75.0110 };

// Fake Razorpay client so tests never hit the network.
const fakeRazorpay = () => {
  let n = 0;
  const fake = {
    orders: { create: jest.fn(async ({ amount, currency }) => ({ id: `order_test_${++n}`, amount, currency })) },
    payments: { refund: jest.fn(async () => ({ id: 'rfnd_test_1' })) },
  };
  payments.setClient(fake);
  return fake;
};

const sign = (orderId, paymentId) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

const signWebhook = (body) => crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');

module.exports = {
  api,
  connect,
  disconnect,
  clear,
  createUser,
  createAgent,
  createRestaurant,
  fakeRazorpay,
  sign,
  signWebhook,
  DHARWAD,
  NEARBY_ADDRESS,
};
