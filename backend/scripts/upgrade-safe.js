// Safe, one-time upgrade for an existing database. DELETES NOTHING.
//
//  1. Sets a new admin password (or creates the admin if missing)
//  2. Gives existing riders a map location + a rider login
//  3. Adds the demo coupons if they don't exist yet
//  4. Marks the known pure-veg restaurants
//
// Usage (from the backend folder, with MONGODB_URI in .env):
//   set NEW_ADMIN_PASSWORD=YourStrongPassword      (Windows: $env:NEW_ADMIN_PASSWORD="...")
//   node scripts/upgrade-safe.js
const config = require('../config');
const mongoose = require('mongoose');
const User = require('../models/User');
const DeliveryAgent = require('../models/DeliveryAgent');
const Restaurant = require('../models/Restaurant');
const Coupon = require('../models/Coupon');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@hungrybirds.com').toLowerCase();
const NEW_ADMIN_PASSWORD = process.env.NEW_ADMIN_PASSWORD || '';
const RIDER_PASSWORD = process.env.RIDER_PASSWORD || 'Rider@12345';
const PURE_VEG = ['Hotel Shree Renuka', 'Dharwad Pedha Sweet House', 'Udupi Krishna Bhavan', 'Hotel Dasaprakash', 'Sweet Cravings Dessert Cafe'];

const run = async () => {
  if (NEW_ADMIN_PASSWORD.length < 8) {
    console.error('❌ Set NEW_ADMIN_PASSWORD (at least 8 characters) before running this script.');
    process.exit(1);
  }
  await mongoose.connect(config.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`✅ Connected to database "${db.databaseName}"`);
  console.log(`   Restaurants: ${await db.collection('restaurants').countDocuments()}, users: ${await db.collection('users').countDocuments()}, orders: ${await db.collection('orders').countDocuments()}\n`);

  // 1. Admin password
  const admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    admin.password = NEW_ADMIN_PASSWORD; // hashed by the model on save
    admin.role = 'admin';
    await admin.save({ validateBeforeSave: false });
    console.log(`🔑 Admin password changed for ${ADMIN_EMAIL}`);
  } else {
    await User.create({ name: 'Admin', email: ADMIN_EMAIL, phone: '9000000000', password: NEW_ADMIN_PASSWORD, role: 'admin' });
    console.log(`🔑 Admin account created: ${ADMIN_EMAIL}`);
  }

  // 2. Riders: old {lat,lng} → GeoJSON location, and a login account
  const agents = await db.collection('deliveryagents').find({}).toArray();
  for (const a of agents) {
    const set = {};
    const coords = a.location?.coordinates;
    if ((!coords || (coords[0] === 0 && coords[1] === 0)) && a.currentLocation?.lat != null) {
      set.location = { type: 'Point', coordinates: [a.currentLocation.lng, a.currentLocation.lat] };
    }
    if (!a.userId) {
      let user = await User.findOne({ email: a.email.toLowerCase() });
      if (!user) {
        user = await User.create({ name: a.name, email: a.email, phone: a.phone, password: RIDER_PASSWORD, role: 'agent' });
        console.log(`🛵 Rider login created: ${a.email} / ${RIDER_PASSWORD}`);
      } else if (user.role !== 'agent') {
        console.log(`⚠️  ${a.email} already belongs to a ${user.role} account — rider login skipped`);
        user = null;
      }
      if (user) set.userId = user._id;
    }
    if (Object.keys(set).length) await db.collection('deliveryagents').updateOne({ _id: a._id }, { $set: set });
  }
  console.log(`🛵 ${agents.length} riders checked`);

  // 3. Coupons (only adds missing ones)
  const pedha = await Restaurant.findOne({ name: 'Dharwad Pedha Sweet House' });
  const coupons = [
    { code: 'WELCOME50', description: '50% off your first order (up to ₹100)', type: 'percent', value: 50, maxDiscount: 100, minOrder: 149, firstOrderOnly: true },
    { code: 'HUNGRY20', description: '20% off up to ₹80 on orders above ₹249', type: 'percent', value: 20, maxDiscount: 80, minOrder: 249 },
    { code: 'FLAT75', description: 'Flat ₹75 off on orders above ₹399', type: 'flat', value: 75, minOrder: 399 },
    ...(pedha ? [{ code: 'PEDHA30', description: '₹30 off at Dharwad Pedha Sweet House', type: 'flat', value: 30, minOrder: 150, restaurantId: pedha._id }] : []),
  ];
  let added = 0;
  for (const c of coupons) {
    if (!(await Coupon.exists({ code: c.code }))) {
      await Coupon.create(c);
      added += 1;
    }
  }
  console.log(`🎟️  ${added} coupons added (${coupons.length - added} already existed)`);

  // 4. Pure-veg flags (only where not set yet)
  const veg = await Restaurant.updateMany({ name: { $in: PURE_VEG }, pureVeg: { $exists: false } }, { $set: { pureVeg: true } });
  console.log(`🥬 ${veg.modifiedCount} restaurants marked pure veg`);

  // Make sure the geo indexes exist for the new rider search.
  await Promise.all([DeliveryAgent.syncIndexes(), Restaurant.syncIndexes(), Coupon.syncIndexes()]);

  console.log('\n🎉 Done. Nothing was deleted.');
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('❌', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
