const { api, connect, disconnect, clear, createUser, createRestaurant, NEARBY_ADDRESS } = require('./helpers');
const MenuItem = require('../models/MenuItem');

beforeAll(connect);
afterAll(disconnect);
afterEach(clear);

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('restaurants', () => {
  test('only admins can create, and only whitelisted fields are saved', async () => {
    const customer = await createUser();
    const admin = await createUser({ role: 'admin' });
    const body = { name: 'Hotel Hubli Hub', cuisine: ['Chinese'], address: 'Club Road, Hubli', lat: 15.36, lng: 75.13, rating: 5, totalRatings: 9999 };

    expect((await api().post('/api/restaurants').set(bearer(customer.token)).send(body)).status).toBe(403);
    const res = await api().post('/api/restaurants').set(bearer(admin.token)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(0);
    expect(res.body.totalRatings).toBe(0);
    expect(res.body.location.coordinates).toEqual([75.13, 15.36]);
  });

  test('nearby search returns distance and supports filters', async () => {
    await createRestaurant({ name: 'Veg Corner', pureVeg: true, cuisine: ['South Indian'] });
    await createRestaurant({ name: 'Kebab King', pureVeg: false, cuisine: ['Kebab'], rating: 4.6 });
    await createRestaurant({ name: 'Hubli Diner', location: { type: 'Point', coordinates: [75.124, 15.3647] } });

    const near = await api().get('/api/restaurants/nearby').query({ lat: NEARBY_ADDRESS.lat, lng: NEARBY_ADDRESS.lng, radius: 5000 });
    expect(near.status).toBe(200);
    expect(near.body.map((r) => r.name).sort()).toEqual(['Kebab King', 'Veg Corner']);
    expect(near.body[0].distanceKm).toBeGreaterThan(0);

    const veg = await api().get('/api/restaurants/nearby').query({ lat: 15.45, lng: 75.01, veg: true });
    expect(veg.body.map((r) => r.name)).toEqual(['Veg Corner']);

    const q = await api().get('/api/restaurants/nearby').query({ lat: 15.45, lng: 75.01, q: 'kebab' });
    expect(q.body.map((r) => r.name)).toEqual(['Kebab King']);

    expect((await api().get('/api/restaurants/nearby').query({ lat: 200, lng: 75 })).status).toBe(400);
  });

  test('search finds dishes on the menu and tolerates spelling', async () => {
    const { restaurant: kebab } = await createRestaurant({ name: 'Kebab King', cuisine: ['Mughlai'] });
    await MenuItem.create({ restaurantId: kebab._id, name: 'Chicken Biryani', price: 220, category: 'Rice', isVeg: false });
    await createRestaurant({ name: 'Paneer Palace', cuisine: ['North Indian'] });
    const search = async (q) =>
      (await api().get('/api/restaurants/nearby').query({ lat: 15.45, lng: 75.01, q })).body.map((r) => r.name).sort();

    expect(await search('biriyani')).toEqual(['Kebab King']); // misspelt dish name
    expect(await search('biryani')).toEqual(['Kebab King']);
    expect(await search('panner')).toEqual(['Paneer Palace']); // misspelt restaurant name
    expect(await search('dosa')).toEqual(['Kebab King', 'Paneer Palace']); // dish on both menus
    expect(await search('pizza')).toEqual([]);
  });

  test('menu: sold-out items hidden by default, admin can toggle availability', async () => {
    const admin = await createUser({ role: 'admin' });
    const { restaurant, soldOut } = await createRestaurant();
    const menu = await api().get(`/api/menu/${restaurant._id}`);
    expect(menu.body.items.map((i) => i.name)).not.toContain('Kesari Bath');

    await api().put(`/api/menu/${soldOut._id}`).set(bearer(admin.token)).send({ isAvailable: true }).expect(200);
    const after = await api().get(`/api/menu/${restaurant._id}`);
    expect(after.body.items.map((i) => i.name)).toContain('Kesari Bath');
  });
});

describe('riders', () => {
  test('admin creates a rider who can log in and manage their shift', async () => {
    const admin = await createUser({ role: 'admin' });
    const create = await api()
      .post('/api/agents')
      .set(bearer(admin.token))
      .send({ name: 'Ravi Rider', phone: '9000011111', email: 'ravi@hb.com', password: 'Rider@1234', vehicleType: 'scooter' });
    expect(create.status).toBe(201);

    const login = await api().post('/api/auth/login').send({ email: 'ravi@hb.com', password: 'Rider@1234' });
    expect(login.body.role).toBe('agent');

    const me = await api().get('/api/agents/me').set(bearer(login.body.token));
    expect(me.body.agent.name).toBe('Ravi Rider');

    await api().put('/api/agents/me/status').set(bearer(login.body.token)).send({ isOnline: true }).expect(200);
    await api().put('/api/agents/me/location').set(bearer(login.body.token)).send({ lat: 15.45, lng: 75.0 }).expect(200);
    const after = await api().get('/api/agents/me').set(bearer(login.body.token));
    expect(after.body.agent.currentLocation).toEqual({ lat: 15.45, lng: 75.0 });

    // Customers can't use rider endpoints
    const customer = await createUser();
    expect((await api().put('/api/agents/me/location').set(bearer(customer.token)).send({ lat: 1, lng: 1 })).status).toBe(403);
  });

  test('the old unauthenticated location endpoint is gone', async () => {
    const res = await api().put('/api/agents/65f1c2e4a1b2c3d4e5f60718/location').send({ lat: 1, lng: 1 });
    expect([401, 404]).toContain(res.status);
  });
});

describe('analytics', () => {
  test('stats are admin-only and summarise orders', async () => {
    const admin = await createUser({ role: 'admin' });
    const customer = await createUser();
    const { restaurant, dosa } = await createRestaurant();
    await api()
      .post('/api/orders')
      .set(bearer(customer.token))
      .send({ restaurantId: restaurant._id, items: [{ menuItemId: dosa._id, quantity: 3 }], paymentMethod: 'cod', deliveryAddress: NEARBY_ADDRESS })
      .expect(201);

    expect((await api().get('/api/admin/stats').set(bearer(customer.token))).status).toBe(403);
    const res = await api().get('/api/admin/stats?days=7').set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.totals.orders).toBe(1);
    expect(res.body.daily).toHaveLength(7);
    expect(res.body.daily.at(-1).orders).toBe(1);
    expect(res.body.topDishes[0]).toMatchObject({ name: 'Masala Dosa', quantity: 3 });
  });
});

describe('platform', () => {
  test('health, docs, security headers and 404s', async () => {
    const health = await api().get('/api/health');
    expect(health.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-powered-by']).toBeUndefined();
    expect((await api().get('/api/openapi.json')).body.openapi).toBe('3.0.3');
    expect((await api().get('/api/nope')).status).toBe(404);
  });

  test('CORS only allows configured origins', async () => {
    const ok = await api().get('/api/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const evil = await api().get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('uploads report a clear error when Cloudinary is not configured', async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await api().post('/api/uploads').set(bearer(admin.token)).attach('image', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(503);
  });
});
