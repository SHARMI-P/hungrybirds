const { ZodError } = require('zod');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const config = require('../config');

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Central error handler: turns every error into a consistent JSON shape
// and never leaks stack traces or internal messages in production.
 
const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, ...(err.details && { details: err.details }) });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  if (!config.isTest) console.error(err);
  res.status(500).json({ message: config.isProd ? 'Something went wrong' : err.message || 'Something went wrong' });
};

module.exports = { notFound, errorHandler };
