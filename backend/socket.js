// Socket.io with JWT authentication. Clients connect with
//   io(URL, { auth: { token } })
// and can only join rooms for orders they are allowed to see.
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const config = require('./config');
const Order = require('./models/Order');
const DeliveryAgent = require('./models/DeliveryAgent');
const { userFromToken } = require('./middleware/auth');
const { agentIdForUser } = require('./services/orderLifecycle');
const { findWorkForAgent } = require('./services/dispatch');
const { setIo, orderRoom, agentRoom, ADMIN_ROOM, emitToOrder } = require('./services/realtime');

const LOCATION_MIN_INTERVAL_MS = 2000;

const isCoord = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const canViewOrder = (order, socket) => {
  const { user, agentId } = socket.data;
  if (user.role === 'admin') return true;
  if (order.userId.equals(user._id)) return true;
  return Boolean(agentId && order.deliveryAgentId?.equals(agentId));
};

const attachSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigins, methods: ['GET', 'POST'] },
  });
  setIo(io);

  io.use(async (socket, next) => {
    const user = await userFromToken(socket.handshake.auth?.token);
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    socket.data.agentId = await agentIdForUser(user);
    next();
  });

  io.on('connection', (socket) => {
    const { user, agentId } = socket.data;
    if (user.role === 'admin') socket.join(ADMIN_ROOM);
    if (agentId) socket.join(agentRoom(agentId));

    socket.on('join_order', async (orderId, ack = () => {}) => {
      if (!mongoose.isValidObjectId(orderId)) return ack({ ok: false, error: 'invalid order id' });
      const order = await Order.findById(orderId, 'userId deliveryAgentId');
      if (!order || !canViewOrder(order, socket)) return ack({ ok: false, error: 'not allowed' });
      socket.join(orderRoom(orderId));
      ack({ ok: true });
    });

    socket.on('leave_order', (orderId) => socket.leave(orderRoom(orderId)));

    // Riders stream GPS over the socket (cheaper than HTTP every few seconds).
    // The order to broadcast to is taken from the DB, never from the client.
    socket.on('agent_location_update', async ({ lat, lng } = {}) => {
      if (!agentId || !isCoord(lat, lng)) return;
      const now = Date.now();
      if (now - (socket.data.lastPing || 0) < LOCATION_MIN_INTERVAL_MS) return;
      socket.data.lastPing = now;

      const agent = await DeliveryAgent.findByIdAndUpdate(
        agentId,
        { location: { type: 'Point', coordinates: [lng, lat] }, lastLocationAt: new Date(now) },
        { new: true },
      );
      if (agent?.currentOrderId) emitToOrder(agent.currentOrderId, 'location_update', { lat, lng, at: new Date(now) });
      else if (agent?.isOnline) await findWorkForAgent(agent._id); // first GPS fix → pick up waiting orders
    });
  });

  return io;
};

module.exports = { attachSocket };
