// Thin wrapper so routes/services can emit socket events without needing req.app.
let io = null;

const setIo = (instance) => { io = instance; };

const orderRoom = (orderId) => `order_${orderId}`;
const ADMIN_ROOM = 'admins';
const agentRoom = (agentId) => `agent_${agentId}`;

const emitToOrder = (orderId, event, payload) => io?.to(orderRoom(orderId)).emit(event, payload);
const emitToAdmins = (event, payload) => io?.to(ADMIN_ROOM).emit(event, payload);
const emitToAgent = (agentId, event, payload) => io?.to(agentRoom(agentId)).emit(event, payload);

module.exports = { setIo, orderRoom, agentRoom, ADMIN_ROOM, emitToOrder, emitToAdmins, emitToAgent };
