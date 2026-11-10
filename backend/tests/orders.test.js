const {
  api, connect, disconnect, clear, createUser, createAgent, createRestaurant, NEARBY_ADDRESS,
} = require('./helpers');
const Coupon = require('../models/Coupon');
const DeliveryAgent = require('../models/DeliveryAgent');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

beforeAll(connect);
afterAll(disconnect);
afterEach(clear);

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const placeCod = (token, restaurant, items, extra = {}) =>
  api()
    .post('/api/orders')
    .set(bearer(token))
    .send({ restaurantId: restaurant._id, items, paymentMethod: 'cod', deliveryAddress: NEARBY_ADDRESS, ...extra });

describe('pricing (server is the source of truth)', () => {
  test('quote uses database prices and ignores client-sent prices', async () => {
    const { token } = await createUser();
    const { restaurant, dosa, coffee } = await createRestaurant();
    const res = await api()
      .post('/api/orders/quote')
      .set(bearer(token))
      .send({
        restaurantId: restaurant._id,
        items: [{ menuItemId: dosa._id, quantity: 2, price: 1 }, { menuItemId: coffee._id, quantity: 1 }],
        deliveryLocation: NEARBY_ADDRESS,
        finalAmount: 1,
      });
    expect(res.status).toBe(200);
    expect(res.body.subtotal).toBe(150); // 2×60 + 30
    expect(res.body.deliveryFee).toBe(20); // within free 3 km
    expect(res.body.tax).toBe(8); // 5% of 150 = 7.5 → 8
    expect(res.body.finalAmount).toBe(178);
    expect(res.body.estimatedDelivery).toMatch(/mins$/);
  });

  test('a tampered order body still gets the real total', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const res = await placeCod(token, restaurant, [{ menuItemId: dosa._id, quantity: 2 }], { finalAmount: 1, subtotal: 1 });
    expect(res.status).toBe(201);
    expect(res.body.order.subtotal).toBe(120);
    expect(res.body.order.finalAmount).toBe(120 + 20 + 6);
  });

  test('minimum order, sold-out items and foreign items are rejected', async () => {
    const { token } = await createUser();
    const { restaurant, coffee, soldOut } = await createRestaurant();
    const other = await createRestaurant({ name: 'Elsewhere' });

    const min = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items: [{ menuItemId: coffee._id, quantity: 1 }] });
    expect(min.status).toBe(400);
    expect(min.body.details.shortBy).toBe(70);

    const sold = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items: [{ menuItemId: soldOut._id, quantity: 3 }] });
    expect(sold.status).toBe(400);
    expect(sold.body.message).toMatch(/sold out/);

    const foreign = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items: [{ menuItemId: other.dosa._id, quantity: 3 }] });
    expect(foreign.status).toBe(400);
  });

  test('distance surcharge and maximum delivery distance', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const items = [{ menuItemId: dosa._id, quantity: 2 }];
    // ~8 km away → 5 extra km × ₹6
    const far = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items, deliveryLocation: { lat: 15.4589, lng: 75.0820 } });
    expect(far.body.distanceKm).toBeGreaterThan(7);
    expect(far.body.deliveryFee).toBe(20 + 5 * 6);
    // Hubli centre is ~20 km → too far
    const tooFar = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items, deliveryLocation: { lat: 15.3647, lng: 75.124 } });
    expect(tooFar.status).toBe(400);
  });

  test('coupons: percent with cap, min order, first-order-only', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    await Coupon.create([
      { code: 'HALF', type: 'percent', value: 50, maxDiscount: 40, minOrder: 100 },
      { code: 'FIRST', type: 'flat', value: 25, firstOrderOnly: true },
    ]);
    const items = [{ menuItemId: dosa._id, quantity: 2 }];
    const half = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items, couponCode: 'half' });
    expect(half.body.discount).toBe(40);
    expect(half.body.tax).toBe(4); // GST on (120 − 40)

    const bad = await api().post('/api/orders/quote').set(bearer(token)).send({ restaurantId: restaurant._id, items, couponCode: 'NOPE' });
    expect(bad.status).toBe(400);

    expect((await placeCod(token, restaurant, items, { couponCode: 'FIRST' })).status).toBe(201);
    const second = await placeCod(token, restaurant, items, { couponCode: 'FIRST' });
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/first order/);
  });
});

describe('dispatch', () => {
  test('nearest online rider is assigned atomically and marked busy', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const far = await createAgent({ name: 'Far', lat: 15.52, lng: 75.05 });
    const near = await createAgent({ name: 'Near', lat: 15.459, lng: 75.008 });
    await createAgent({ name: 'Offline', lat: 15.4589, lng: 75.0078, isOnline: false });

    const res = await placeCod(token, restaurant, [{ menuItemId: dosa._id, quantity: 2 }]);
    expect(res.body.order.deliveryAgentId._id).toBe(String(near.agent._id));
    expect((await DeliveryAgent.findById(near.agent._id)).isAvailable).toBe(false);

    // The next order goes to the remaining free rider, never the busy one.
    const res2 = await placeCod(token, restaurant, [{ menuItemId: dosa._id, quantity: 2 }]);
    expect(res2.body.order.deliveryAgentId._id).toBe(String(far.agent._id));
  });

  test('an order waits when nobody is free and is picked up when a rider comes online', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const rider = await createAgent({ lat: 15.459, lng: 75.008, isOnline: false });

    const res = await placeCod(token, restaurant, [{ menuItemId: dosa._id, quantity: 2 }]);
    expect(res.body.order.deliveryAgentId).toBeNull();

    await api().put('/api/agents/me/status').set(bearer(rider.token)).send({ isOnline: true }).expect(200);
    const order = await Order.findById(res.body.order._id);
    expect(String(order.deliveryAgentId)).toBe(String(rider.agent._id));
  });
});

describe('authorization and the order state machine', () => {
  const setup = async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const admin = await createUser({ role: 'admin' });
    const { restaurant, dosa } = await createRestaurant();
    const rider = await createAgent({ lat: 15.459, lng: 75.008 });
    const otherRider = await createAgent({ lat: 15.52, lng: 75.05, isOnline: false });
    const { body } = await placeCod(owner.token, restaurant, [{ menuItemId: dosa._id, quantity: 2 }]);
    return { owner, stranger, admin, rider, otherRider, restaurant, order: body.order };
  };

  const setStatus = (token, id, status) => api().put(`/api/orders/${id}/status`).set(bearer(token)).send({ status });

  test('other customers cannot see or touch an order', async () => {
    const { stranger, order } = await setup();
    expect((await api().get(`/api/orders/${order._id}`).set(bearer(stranger.token))).status).toBe(404);
    expect((await setStatus(stranger.token, order._id, 'cancelled')).status).toBe(404);
  });

  test('customers cannot advance their own order', async () => {
    const { owner, order } = await setup();
    expect((await setStatus(owner.token, order._id, 'confirmed')).status).toBe(403);
    expect((await setStatus(owner.token, order._id, 'delivered')).status).toBe(400); // invalid jump
  });

  test('customer cancel frees the rider', async () => {
    const { owner, rider, order } = await setup();
    const res = await api().post(`/api/orders/${order._id}/cancel`).set(bearer(owner.token)).send({});
    expect(res.status).toBe(200);
    expect(res.body.orderStatus).toBe('cancelled');
    expect((await DeliveryAgent.findById(rider.agent._id)).isAvailable).toBe(true);
  });

  test('full delivery flow: admin → rider → review', async () => {
    const { owner, admin, rider, otherRider, restaurant, order } = await setup();

    expect((await setStatus(rider.token, order._id, 'picked_up')).status).toBe(400); // not prepared yet
    await setStatus(admin.token, order._id, 'confirmed').expect(200);
    expect((await setStatus(owner.token, order._id, 'cancelled')).status).toBe(403); // too late for customer
    await setStatus(admin.token, order._id, 'preparing').expect(200);
    expect((await setStatus(otherRider.token, order._id, 'picked_up')).status).toBe(403); // not their order
    await setStatus(rider.token, order._id, 'picked_up').expect(200);

    const riderView = await api().get(`/api/orders/${order._id}`).set(bearer(rider.token));
    expect(riderView.status).toBe(200);

    const done = await setStatus(rider.token, order._id, 'delivered');
    expect(done.body.orderStatus).toBe('delivered');
    expect(done.body.paymentStatus).toBe('paid'); // COD collected
    expect(done.body.statusHistory.map((s) => s.status)).toEqual(['placed', 'confirmed', 'preparing', 'picked_up', 'delivered']);

    const agent = await DeliveryAgent.findById(rider.agent._id);
    expect(agent.isAvailable).toBe(true);
    expect(agent.totalDeliveries).toBe(1);

    const review = await api().post(`/api/orders/${order._id}/review`).set(bearer(owner.token)).send({ rating: 4, comment: 'Crispy dosa!' });
    expect(review.status).toBe(201);
    const r = await Restaurant.findById(restaurant._id);
    expect(r.totalRatings).toBe(1);
    expect(r.rating).toBe(4);
    expect((await api().post(`/api/orders/${order._id}/review`).set(bearer(owner.token)).send({ rating: 5 })).status).toBe(409);

    const reviews = await api().get(`/api/restaurants/${restaurant._id}/reviews`);
    expect(reviews.body[0]).toMatchObject({ rating: 4, comment: 'Crispy dosa!' });
  });

  test('invalid ids and statuses give 400, not 500', async () => {
    const { owner, order } = await setup();
    expect((await api().get('/api/orders/not-an-id').set(bearer(owner.token))).status).toBe(400);
    expect((await setStatus(owner.token, order._id, 'teleported')).status).toBe(400);
  });
});
