const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible in routes
app.set('io', io);

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/restaurants',  require('./routes/restaurants'));
app.use('/api/menu',         require('./routes/menu'));
app.use('/api/cart',         require('./routes/cart'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/agents',       require('./routes/agents'));
app.use('/api/payment',      require('./routes/payment'));

// Health check
app.get('/', (req, res) => res.json({ message: '🐦 HungryBirds API Running!' }));

// Socket.io - Real-time order tracking
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`📦 User joined order room: order_${orderId}`);
  });

  socket.on('agent_location_update', ({ orderId, lat, lng }) => {
    io.to(`order_${orderId}`).emit('location_update', { lat, lng });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
