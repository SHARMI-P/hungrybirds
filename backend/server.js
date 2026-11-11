const http = require('http');
const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');
const { attachSocket } = require('./socket');
const { expireStaleCheckouts } = require('./services/maintenance');
const { releaseDueScheduledOrders } = require('./services/orderLifecycle');

const start = async () => {
  await mongoose.connect(config.MONGODB_URI);
  console.log('✅ MongoDB connected');

  const server = http.createServer(app);
  const io = attachSocket(server);

  server.listen(config.PORT, () => console.log(`🚀 API on http://localhost:${config.PORT}  (docs: /api/docs)`));

  // Cancel checkouts that were never paid, every 5 minutes.
  const timer = setInterval(() => expireStaleCheckouts().catch((e) => console.error('expiry job:', e.message)), 5 * 60 * 1000);

  // Send scheduled orders to the kitchen on time, every minute.
  const scheduler = setInterval(() => releaseDueScheduledOrders().catch((e) => console.error('scheduler:', e.message)), 60 * 1000);

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down…`);
    clearInterval(timer);
    clearInterval(scheduler);
    io.close();
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  console.error('❌ Failed to start:', err.message);
  process.exit(1);
});
