const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { errorResponse } = require('../utils/helpers');

/**
 * Verifies the JWT access token from the Authorization header
 * and attaches the user record to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('Authentication required. Please log in.'));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid authentication token.';
      return res.status(401).json(errorResponse(message));
    }

    const result = await query(
      'SELECT user_id, username, email, role, is_active, first_name, last_name, avatar FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(errorResponse('User no longer exists.'));
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json(errorResponse('This account has been deactivated.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth — attaches req.user if a valid token is present,
 * but does not block the request if absent/invalid.
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT user_id, username, email, role, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    if (result.rows.length && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
  } catch (err) {
    // ignore invalid/expired token for optional auth
  }
  next();
};

/**
 * Restricts access to the given roles.
 * Usage: authorize('admin', 'editor')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(errorResponse('Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(errorResponse('You do not have permission to perform this action.'));
    }
    next();
  };
};

module.exports = { authenticate, optionalAuthenticate, authorize };
