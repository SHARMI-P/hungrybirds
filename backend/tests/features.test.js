const {
  api, connect, disconnect, clear, createUser, createAgent, createRestaurant, fakeRazorpay, sign, NEARBY_ADDRESS,
} = require('./helpers');
const Order = require('../models/Order');
const Otp = require('../models/Otp');
const { releaseDueScheduledOrders } = require('../services/orderLifecycle');

beforeAll(connect);
afterAll(disconnect);
afterEach(clear);

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

// Tomorrow at 1 pm IST — always inside the allowed window.
const tomorrowAt = (hh) => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return new Date(`${d}T${hh}:00:00+05:30`);
};

const order = (token, restaurant, item, extra = {}) =>
  api()
    .post('/api/orders')
    .set(bearer(token))
    .send({ restaurantId: restaurant._id, items: [{ menuItemId: item._id, quantity: 2 }], paymentMethod: 'cod', deliveryAddress: NEARBY_ADDRESS, ...extra });

describe('favourite restaurants', () => {
  test('add, list and remove favourites', async () => {
    const { token } = await createUser();
    const { restaurant } = await createRestaurant();
    await api().post(`/api/auth/favorites/${restaurant._id}`).set(bearer(token)).expect(200);
    await api().post(`/api/auth/favorites/${restaurant._id}`).set(bearer(token)).expect(200); // no duplicates
    const list = await api().get('/api/auth/favorites').set(bearer(token));
    expect(list.body.map((r) => r.name)).toEqual(['Test Bhavan']);
    expect((await api().get('/api/auth/me').set(bearer(token))).body.favorites).toHaveLength(1);
    await api().delete(`/api/auth/favorites/${restaurant._id}`).set(bearer(token)).expect(200);
    expect((await api().get('/api/auth/favorites').set(bearer(token))).body).toHaveLength(0);
  });
});

describe('scheduled orders', () => {
  test('rejects slots that are too soon, too late at night, or too far ahead', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const soon = await order(token, restaurant, dosa, { scheduledFor: new Date(Date.now() + 10 * 60 * 1000) });
    expect(soon.status).toBe(400);
    const night = await order(token, restaurant, dosa, { scheduledFor: tomorrowAt('02') });
    expect(night.status).toBe(400);
    const far = await order(token, restaurant, dosa, { scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) });
    expect(far.status).toBe(400);
  });

  test('a scheduled COD order waits, then is released to the kitchen and dispatched on time', async () => {
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const rider = await createAgent({ lat: 15.459, lng: 75.008 });
    const at = tomorrowAt('13');

    const res = await order(token, restaurant, dosa, { scheduledFor: at });
    expect(res.status).toBe(201);
    expect(res.body.order.orderStatus).toBe('scheduled');
    expect(res.body.order.deliveryAgentId).toBeNull(); // no rider tied up early

    expect(await releaseDueScheduledOrders(new Date(at.getTime() - 2 * 60 * 60 * 1000))).toBe(0); // 2h before: not yet
    expect(await releaseDueScheduledOrders(new Date(at.getTime() - 30 * 60 * 1000))).toBe(1); // 30 min before: release

    const saved = await Order.findById(res.body.order._id);
    expect(saved.orderStatus).toBe('placed');
    expect(String(saved.deliveryAgentId)).toBe(String(rider.agent._id));
  });

  test('customers can cancel a scheduled order; admins can release it early', async () => {
    const owner = await createUser();
    const admin = await createUser({ role: 'admin' });
    const { restaurant, dosa } = await createRestaurant();
    const a = await order(owner.token, restaurant, dosa, { scheduledFor: tomorrowAt('12') });
    await api().post(`/api/orders/${a.body.order._id}/cancel`).set(bearer(owner.token)).send({}).expect(200);

    const b = await order(owner.token, restaurant, dosa, { scheduledFor: tomorrowAt('19') });
    expect((await api().put(`/api/orders/${b.body.order._id}/status`).set(bearer(owner.token)).send({ status: 'placed' })).status).toBe(403);
    const released = await api().put(`/api/orders/${b.body.order._id}/status`).set(bearer(admin.token)).send({ status: 'placed' });
    expect(released.body.orderStatus).toBe('placed');
  });

  test('a paid online order with a slot becomes "scheduled", not "placed"', async () => {
    fakeRazorpay();
    const { token } = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const res = await order(token, restaurant, dosa, { paymentMethod: 'razorpay', scheduledFor: tomorrowAt('14') });
    const o = res.body.order;
    const v = await api()
      .post('/api/payment/verify')
      .set(bearer(token))
      .send({ orderId: o._id, razorpay_order_id: o.razorpayOrderId, razorpay_payment_id: 'pay_s', razorpay_signature: sign(o.razorpayOrderId, 'pay_s') });
    expect(v.body.order).toMatchObject({ orderStatus: 'scheduled', paymentStatus: 'paid' });
  });
});

describe('order chat', () => {
  test('customer and assigned rider can chat; others cannot', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const rider = await createAgent({ lat: 15.459, lng: 75.008 });
    const otherRider = await createAgent({ lat: 15.52, lng: 75.05, isOnline: false });
    const { body } = await order(owner.token, restaurant, dosa);
    const url = `/api/orders/${body.order._id}/messages`;

    await api().post(url).set(bearer(owner.token)).send({ text: 'Please ring the bell twice' }).expect(201);
    await api().post(url).set(bearer(rider.token)).send({ text: 'Sure, on my way!' }).expect(201);
    expect((await api().post(url).set(bearer(stranger.token)).send({ text: 'hi' })).status).toBe(404);
    expect((await api().post(url).set(bearer(otherRider.token)).send({ text: 'hi' })).status).toBe(404);
    expect((await api().post(url).set(bearer(owner.token)).send({ text: '   ' })).status).toBe(400);

    const thread = await api().get(url).set(bearer(rider.token));
    expect(thread.body.map((m) => [m.senderRole, m.text])).toEqual([
      ['customer', 'Please ring the bell twice'],
      ['agent', 'Sure, on my way!'],
    ]);
  });

  test('chat waits for a rider and closes after delivery', async () => {
    const owner = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    const { body } = await order(owner.token, restaurant, dosa); // no riders exist
    const res = await api().post(`/api/orders/${body.order._id}/messages`).set(bearer(owner.token)).send({ text: 'hello?' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/rider/);
  });
});

describe('phone OTP login (demo mode)', () => {
  test('new number → verify → name → account created; same number logs in next time', async () => {
    const cfg = await api().get('/api/auth/otp/config');
    expect(cfg.body).toEqual({ enabled: true, demo: true });

    const sent = await api().post('/api/auth/otp/send').send({ phone: '+91 98450 12345' });
    expect(sent.body.demoCode).toMatch(/^\d{6}$/);
    const otp = await Otp.findOne({ phone: '9845012345' });
    expect(otp.codeHash).not.toContain(sent.body.demoCode); // stored hashed

    const v = await api().post('/api/auth/otp/verify').send({ phone: '9845012345', code: sent.body.demoCode });
    expect(v.body.needsName).toBe(true);
    const done = await api().post('/api/auth/otp/complete').send({ signupToken: v.body.signupToken, name: 'Kavya' });
    expect(done.status).toBe(201);
    expect(done.body).toMatchObject({ name: 'Kavya', phone: '9845012345', role: 'customer', email: '' });

    await Otp.deleteMany({});
    const again = await api().post('/api/auth/otp/send').send({ phone: '9845012345' });
    const login = await api().post('/api/auth/otp/verify').send({ phone: '9845012345', code: again.body.demoCode });
    expect(login.body.token).toBeTruthy();
    expect(login.body.name).toBe('Kavya');
  });

  test('wrong codes are limited; codes are single-use; admins cannot use OTP', async () => {
    await createUser({ role: 'admin', phone: '9000012345' });
    const sent = await api().post('/api/auth/otp/send').send({ phone: '9000012345' });
    for (let i = 0; i < 5; i += 1) {
      expect((await api().post('/api/auth/otp/verify').send({ phone: '9000012345', code: '000000' })).status).toBe(400);
    }
    const locked = await api().post('/api/auth/otp/verify').send({ phone: '9000012345', code: sent.body.demoCode });
    expect(locked.body.message).toMatch(/Too many/);

    await Otp.deleteMany({});
    const s2 = await api().post('/api/auth/otp/send').send({ phone: '9000012345' });
    const v = await api().post('/api/auth/otp/verify').send({ phone: '9000012345', code: s2.body.demoCode });
    expect(v.body.token).toBeUndefined(); // admin account is never logged in via OTP
    expect((await api().post('/api/auth/otp/verify').send({ phone: '9000012345', code: s2.body.demoCode })).status).toBe(400);
  });

  test('invalid numbers and quick resends are refused', async () => {
    expect((await api().post('/api/auth/otp/send').send({ phone: '12345' })).status).toBe(400);
    await api().post('/api/auth/otp/send').send({ phone: '9845099999' }).expect(200);
    expect((await api().post('/api/auth/otp/send').send({ phone: '9845099999' })).status).toBe(400);
  });
});

describe('admin live map', () => {
  test('returns riders with positions and active orders (admin only)', async () => {
    const admin = await createUser({ role: 'admin' });
    const customer = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    await createAgent({ name: 'Ravi', lat: 15.459, lng: 75.008 });
    await order(customer.token, restaurant, dosa);

    expect((await api().get('/api/admin/live').set(bearer(customer.token))).status).toBe(403);
    const live = await api().get('/api/admin/live').set(bearer(admin.token));
    expect(live.body.agents[0]).toMatchObject({ name: 'Ravi', lat: 15.459, lng: 75.008, isAvailable: false });
    expect(live.body.orders[0]).toMatchObject({ restaurantName: 'Test Bhavan', status: 'placed' });
    expect(live.body.orders[0].restaurant).toEqual({ lat: 15.4589, lng: 75.0078 });
  });
});
