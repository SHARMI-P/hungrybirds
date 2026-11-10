const http = require('http');
const { io: connectClient } = require('socket.io-client');
const app = require('../app');
const { attachSocket } = require('../socket');
const { api, connect, disconnect, clear, createUser, createAgent, createRestaurant, NEARBY_ADDRESS } = require('./helpers');

let server;
let ioServer;
let url;
const clients = [];

beforeAll(async () => {
  await connect();
  server = http.createServer(app);
  ioServer = attachSocket(server);
  await new Promise((r) => server.listen(0, r));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.close());
  await clear();
});

afterAll(async () => {
  ioServer.close();
  await new Promise((r) => server.close(r));
  await disconnect();
});

const client = (token) =>
  new Promise((resolve, reject) => {
    const c = connectClient(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    clients.push(c);
    c.on('connect', () => resolve(c));
    c.on('connect_error', reject);
  });

const join = (c, orderId) => new Promise((resolve) => c.emit('join_order', orderId, resolve));
const next = (c, event) => new Promise((resolve) => c.once(event, resolve));

const placeOrder = async () => {
  const customer = await createUser();
  const admin = await createUser({ role: 'admin' });
  const { restaurant, dosa } = await createRestaurant();
  const rider = await createAgent({ lat: 15.459, lng: 75.008 });
  const { body } = await api()
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .send({ restaurantId: restaurant._id, items: [{ menuItemId: dosa._id, quantity: 2 }], paymentMethod: 'cod', deliveryAddress: NEARBY_ADDRESS });
  return { customer, admin, rider, order: body.order };
};

describe('realtime', () => {
  test('connections without a valid token are refused', async () => {
    await expect(client('nope')).rejects.toThrow('unauthorized');
  });

  test('only the owner (or admin / assigned rider) can join an order room', async () => {
    const { customer, order } = await placeOrder();
    const stranger = await createUser();
    expect(await join(await client(customer.token), order._id)).toEqual({ ok: true });
    expect(await join(await client(stranger.token), order._id)).toMatchObject({ ok: false });
  });

  test('customer receives status changes and live rider GPS', async () => {
    const { customer, admin, rider, order } = await placeOrder();
    const c = await client(customer.token);
    await join(c, order._id);

    const status = next(c, 'order_status_update');
    await api().put(`/api/orders/${order._id}/status`).set('Authorization', `Bearer ${admin.token}`).send({ status: 'confirmed' });
    expect(await status).toMatchObject({ status: 'confirmed' });

    const riderSocket = await client(rider.token);
    const gps = next(c, 'location_update');
    riderSocket.emit('agent_location_update', { lat: 15.455, lng: 75.009, orderId: 'ignored-by-server' });
    expect(await gps).toMatchObject({ lat: 15.455, lng: 75.009 });
  });

  test('admins are notified about new orders', async () => {
    const admin = await createUser({ role: 'admin' });
    const a = await client(admin.token);
    const evt = next(a, 'new_order');
    const customer = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    await api()
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ restaurantId: restaurant._id, items: [{ menuItemId: dosa._id, quantity: 2 }], paymentMethod: 'cod', deliveryAddress: NEARBY_ADDRESS });
    expect(await evt).toHaveProperty('orderId');
  });
});
