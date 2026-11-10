// The single source of truth for what an order costs. The browser only sends
// item IDs and quantities; prices, fees, discounts and tax are all computed here.
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const config = require('../config');
const { haversineKm, fromPoint } = require('./geo');

const FREE_KM = 3; // base delivery fee covers the first 3 km
const PER_KM_FEE = 6; // ₹ per extra km
const RIDE_MINS_PER_KM = 3;

const round2 = (n) => Math.round(n * 100) / 100;

const deliveryFeeFor = (baseFee, km) => Math.round(baseFee + Math.max(0, Math.ceil(km - FREE_KM)) * PER_KM_FEE);

const etaFor = (prepMins, km) => {
  const mins = prepMins + Math.ceil(km * RIDE_MINS_PER_KM);
  return `${mins}-${mins + 10} mins`;
};

const couponDiscount = async ({ code, userId, restaurantId, subtotal }) => {
  if (!code) return { discount: 0, coupon: null };
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
  if (!coupon) throw AppError.badRequest('Invalid coupon code');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw AppError.badRequest('This coupon has expired');
  if (coupon.restaurantId && !coupon.restaurantId.equals(restaurantId)) {
    throw AppError.badRequest('This coupon is not valid for this restaurant');
  }
  if (subtotal < coupon.minOrder) throw AppError.badRequest(`Add items worth ₹${coupon.minOrder - subtotal} more to use ${coupon.code}`);
  if (coupon.firstOrderOnly) {
    const previous = await Order.exists({ userId, orderStatus: { $nin: ['cancelled', 'awaiting_payment'] } });
    if (previous) throw AppError.badRequest(`${coupon.code} is only valid on your first order`);
  }
  let discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(Math.round(discount), subtotal);
  return { discount, coupon };
};

/**
 * @param {object} input
 * @param {string} input.restaurantId
 * @param {{menuItemId: string, quantity: number}[]} input.items
 * @param {string} [input.couponCode]
 * @param {{lat:number,lng:number}} [input.deliveryLocation]
 * @param {string} [input.userId]
 */
const quoteOrder = async ({ restaurantId, items, couponCode, deliveryLocation, userId }) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw AppError.notFound('Restaurant not found');
  if (!restaurant.isOpen) throw AppError.badRequest(`${restaurant.name} is closed right now`);

  // Merge duplicate lines, then load the real items from the database.
  const qtyById = new Map();
  for (const { menuItemId, quantity } of items) {
    qtyById.set(String(menuItemId), (qtyById.get(String(menuItemId)) || 0) + quantity);
  }
  const dbItems = await MenuItem.find({ _id: { $in: [...qtyById.keys()] }, restaurantId: restaurant._id });
  const byId = new Map(dbItems.map((i) => [String(i._id), i]));

  const lines = [];
  for (const [id, quantity] of qtyById) {
    const item = byId.get(id);
    if (!item) throw AppError.badRequest('Some items in your cart are not on this restaurant\'s menu');
    if (!item.isAvailable) throw AppError.badRequest(`${item.name} is sold out right now`);
    lines.push({ menuItemId: item._id, name: item.name, price: item.price, quantity, image: item.image, isVeg: item.isVeg });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  if (subtotal < restaurant.minimumOrder) {
    throw AppError.badRequest(`Minimum order at ${restaurant.name} is ₹${restaurant.minimumOrder}`, {
      code: 'MIN_ORDER',
      shortBy: restaurant.minimumOrder - subtotal,
    });
  }

  let distanceKm = 0;
  if (deliveryLocation) {
    distanceKm = round2(haversineKm(fromPoint(restaurant.location), deliveryLocation));
    if (distanceKm > config.MAX_DELIVERY_KM) {
      throw AppError.badRequest(`Sorry, ${restaurant.name} doesn't deliver that far (${distanceKm} km, max ${config.MAX_DELIVERY_KM} km)`);
    }
  }

  const { discount, coupon } = await couponDiscount({ code: couponCode, userId, restaurantId: restaurant._id, subtotal });
  const deliveryFee = deliveryFeeFor(restaurant.deliveryFee, distanceKm);
  const tax = Math.round(((subtotal - discount) * config.GST_PERCENT) / 100);
  const finalAmount = subtotal - discount + deliveryFee + tax;

  return {
    restaurant,
    items: lines,
    subtotal,
    discount,
    couponCode: coupon ? coupon.code : '',
    deliveryFee,
    tax,
    taxPercent: config.GST_PERCENT,
    finalAmount,
    distanceKm,
    estimatedDelivery: etaFor(restaurant.prepTimeMins, distanceKm),
  };
};

// Shape returned to the client (without the full restaurant document).
const publicQuote = (q) => ({
  restaurantId: q.restaurant._id,
  restaurantName: q.restaurant.name,
  items: q.items,
  subtotal: q.subtotal,
  discount: q.discount,
  couponCode: q.couponCode,
  deliveryFee: q.deliveryFee,
  tax: q.tax,
  taxPercent: q.taxPercent,
  finalAmount: q.finalAmount,
  distanceKm: q.distanceKm,
  estimatedDelivery: q.estimatedDelivery,
});

module.exports = { quoteOrder, publicQuote, deliveryFeeFor, etaFor };
