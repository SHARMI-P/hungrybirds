const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const config = require('../config');

const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

// Resolve a token to an active user, or null.
const userFromToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
};

const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(AppError.unauthorized('Not authorized, no token'));

  const user = await userFromToken(token);
  // A valid signature for a deleted user must not pass.
  if (!user) return next(AppError.unauthorized('Not authorized, token invalid or expired'));

  req.user = user;
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(AppError.forbidden());
  next();
};

const adminOnly = requireRole('admin');

module.exports = { protect, adminOnly, requireRole, signToken, userFromToken };
