const {
  api, connect, disconnect, clear, createUser, createAgent, createRestaurant, fakeRazorpay, sign, signWebhook, NEARBY_ADDRESS,
} = require('./helpers');
const Order = require('../models/Order');
const { expireStaleCheckouts } = require('../services/maintenance');

beforeAll(connect);
afterAll(disconnect);
afterEach(clear);

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const checkout = async () => {
  const razorpay = fakeRazorpay();
  const customer = await createUser();
  const { restaurant, dosa } = await createRestaurant();
  const rider = await createAgent({ lat: 15.459, lng: 75.008 });
  const res = await api()
    .post('/api/orders')
    .set(bearer(customer.token))
    .send({ restaurantId: restaurant._id, items: [{ menuItemId: dosa._id, quantity: 2 }], paymentMethod: 'razorpay', deliveryAddress: NEARBY_ADDRESS });
  return { razorpay, customer, rider, res, order: res.body.order, payment: res.body.payment };
};

const verify = (token, order, paymentId, signature) =>
  api()
    .post('/api/payment/verify')
    .set(bearer(token))
    .send({ orderId: order._id, razorpay_order_id: order.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature });

describe('online payments', () => {
  test('checkout creates a Razorpay order for the server-computed amount and waits for payment', async () => {
    const { razorpay, res, order, payment } = await checkout();
    expect(res.status).toBe(201);
    expect(razorpay.orders.create).toHaveBeenCalledWith(expect.objectContaining({ amount: (120 + 20 + 6) * 100, currency: 'INR' }));
    expect(order.orderStatus).toBe('awaiting_payment');
    expect(order.deliveryAgentId).toBeNull();
    expect(payment).toMatchObject({ key: 'rzp_test_key', orderId: order.razorpayOrderId });
  });

  test('unpaid checkouts are hidden from "My orders"', async () => {
    const { customer } = await checkout();
    const mine = await api().get('/api/orders/my').set(bearer(customer.token));
    expect(mine.body).toHaveLength(0);
  });

  test('a forged signature is rejected and marks the payment failed', async () => {
    const { customer, order } = await checkout();
    const res = await verify(customer.token, order, 'pay_123', 'f'.repeat(64));
    expect(res.status).toBe(400);
    expect((await Order.findById(order._id)).paymentStatus).toBe('failed');
  });

  test('a valid signature places the order, assigns a rider, and is idempotent', async () => {
    const { customer, rider, order } = await checkout();
    const sig = sign(order.razorpayOrderId, 'pay_123');
    const res = await verify(customer.token, order, 'pay_123', sig);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ orderStatus: 'placed', paymentStatus: 'paid', razorpayPaymentId: 'pay_123' });
    expect(res.body.order.deliveryAgentId._id).toBe(String(rider.agent._id));

    const again = await verify(customer.token, order, 'pay_123', sig);
    expect(again.status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved.statusHistory.filter((s) => s.status === 'placed')).toHaveLength(1);
  });

  test('someone else cannot verify (or reuse) your payment', async () => {
    const { order } = await checkout();
    const intruder = await createUser();
    const res = await verify(intruder.token, order, 'pay_123', sign(order.razorpayOrderId, 'pay_123'));
    expect(res.status).toBe(404);
  });

  test('cancelling a paid order triggers an automatic refund', async () => {
    const { razorpay, customer, order } = await checkout();
    await verify(customer.token, order, 'pay_9', sign(order.razorpayOrderId, 'pay_9')).expect(200);
    const res = await api().post(`/api/orders/${order._id}/cancel`).set(bearer(customer.token)).send({});
    expect(res.status).toBe(200);
    expect(razorpay.payments.refund).toHaveBeenCalledWith('pay_9', expect.objectContaining({ amount: 14600 }));
    expect(res.body.paymentStatus).toBe('refunded');
  });
});

describe('Razorpay webhook', () => {
  const event = (order, name = 'payment.captured', amount = order.finalAmount * 100) =>
    JSON.stringify({ event: name, payload: { payment: { entity: { id: 'pay_wh', order_id: order.razorpayOrderId, amount } } } });

  const post = (body, signature) =>
    api().post('/api/payment/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signature).send(body);

  test('rejects a bad signature', async () => {
    const { order } = await checkout();
    expect((await post(event(order), 'bad')).status).toBe(400);
  });

  test('payment.captured places the order even if the browser never called /verify', async () => {
    const { order } = await checkout();
    const body = event(order);
    expect((await post(body, signWebhook(body))).status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved.orderStatus).toBe('placed');
    expect(saved.paymentStatus).toBe('paid');
  });

  test('rejects a captured amount that does not match the order', async () => {
    const { order } = await checkout();
    const body = event(order, 'payment.captured', 100);
    expect((await post(body, signWebhook(body))).status).toBe(400);
    expect((await Order.findById(order._id)).paymentStatus).toBe('pending');
  });

  test('a late payment for an expired checkout is refunded automatically', async () => {
    const { razorpay, order } = await checkout();
    await Order.collection.updateOne({ _id: new Order.base.Types.ObjectId(order._id) }, { $set: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } });
    expect(await expireStaleCheckouts()).toBe(1);

    const body = event(order);
    await post(body, signWebhook(body)).expect(200);
    expect(razorpay.payments.refund).toHaveBeenCalled();
    expect((await Order.findById(order._id)).paymentStatus).toBe('refunded');
  });
});
