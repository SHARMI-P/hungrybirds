// Express app (no network listener) — imported by server.js and by the tests.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
const { webhook } = require('./routes/payment');

const app = express();

app.set('trust proxy', 1); // behind Render/Vercel proxies → real client IP for rate limiting

// API docs (Swagger UI needs a relaxed CSP, so it's mounted before the global helmet).
const spec = YAML.parse(fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8'));
app.use('/api/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'HungryBirds API' }));
app.get('/api/openapi.json', (req, res) => res.json(spec));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
    credentials: false,
  }),
);
app.use(compression());
if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));

// Razorpay webhook needs the raw body for signature verification → before express.json().
app.post('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }), webhook);

app.use(express.json({ limit: '100kb' }));

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isTest ? 10000 : 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down' },
  }),
);

// Health checks (used by Render and docker-compose)
const health = (req, res) =>
  res.json({ status: 'ok', message: '🐦 HungryBirds API Running!', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
app.get('/', health);
app.get('/api/health', health);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/admin', require('./routes/admin'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
