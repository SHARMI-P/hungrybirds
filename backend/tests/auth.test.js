const { api, connect, disconnect, clear, createUser } = require('./helpers');
const User = require('../models/User');

beforeAll(connect);
afterAll(disconnect);
afterEach(clear);

const valid = { name: 'Asha Patil', email: 'asha@example.com', phone: '9876543210', password: 'Secret@123' };

describe('auth', () => {
  test('register creates a customer and never trusts a client-sent role', async () => {
    const res = await api().post('/api/auth/register').send({ ...valid, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('customer');
    expect(res.body.token).toBeTruthy();
    expect(res.body.password).toBeUndefined();
  });

  test('register validates input with field errors', async () => {
    const res = await api().post('/api/auth/register').send({ ...valid, phone: '12345', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['phone', 'password']));
  });

  test('duplicate email → 409', async () => {
    await api().post('/api/auth/register').send(valid);
    const res = await api().post('/api/auth/register').send({ ...valid, email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
  });

  test('login: wrong password → 401, right password → token without hash', async () => {
    await api().post('/api/auth/register').send(valid);
    expect((await api().post('/api/auth/login').send({ email: valid.email, password: 'nope' })).status).toBe(401);
    const ok = await api().post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.password).toBeUndefined();
  });

  test('a valid token for a deleted user is rejected', async () => {
    const { user, token } = await createUser();
    await User.deleteOne({ _id: user._id });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('no token / garbage token → 401', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi')).status).toBe(401);
  });

  test('saved addresses can be added and removed', async () => {
    const { token } = await createUser();
    const auth = { Authorization: `Bearer ${token}` };
    const add = await api().post('/api/auth/addresses').set(auth).send({ label: 'Work', fullAddress: 'Vidyanagar, Hubli', lat: 15.36, lng: 75.13 });
    expect(add.status).toBe(201);
    expect(add.body).toHaveLength(1);
    const del = await api().delete(`/api/auth/addresses/${add.body[0]._id}`).set(auth);
    expect(del.body).toHaveLength(0);
  });

  test('malformed JSON → 400 instead of 500', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
  });
});
