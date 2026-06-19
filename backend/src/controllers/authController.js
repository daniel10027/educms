const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../config/database');
const { successResponse, errorResponse, generateToken } = require('../utils/helpers');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

const signAccessToken = (user) =>
  jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const signRefreshToken = (user) =>
  jwt.sign({ userId: user.user_id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });

const logActivity = async (userId, action, entityType, entityId, description, req) => {
  try {
    await query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, entityType, entityId, description, req.ip, req.headers['user-agent']]
    );
  } catch (err) {
    logger.error('Failed to log activity', { error: err.message });
  }
};

const register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    const existing = await query('SELECT user_id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json(errorResponse('A user with that email or username already exists.'));
    }

    const passwordHash = await bcrypt.hash(password, ROUNDS);
    const verificationToken = generateToken(24);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, verification_token)
       VALUES ($1, $2, $3, $4, $5, 'subscriber', $6)
       RETURNING user_id, username, email, first_name, last_name, role, created_at`,
      [username, email, passwordHash, firstName || null, lastName || null, verificationToken]
    );

    const user = result.rows[0];
    await logActivity(user.user_id, 'register', 'user', user.user_id, 'New account created', req);

    const accessToken = signAccessToken({ user_id: user.user_id, role: user.role });
    const refreshToken = signRefreshToken({ user_id: user.user_id });

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.user_id, refreshToken]
    );

    res.status(201).json(successResponse({ user, accessToken, refreshToken }, 'Account created successfully.'));
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT user_id, username, email, password_hash, first_name, last_name, role, is_active, avatar
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json(errorResponse('This account has been deactivated.'));
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json(errorResponse('Invalid email or password.'));
    }

    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);
    await logActivity(user.user_id, 'login', 'user', user.user_id, 'User logged in', req);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.user_id, refreshToken]
    );

    delete user.password_hash;
    res.json(successResponse({ user, accessToken, refreshToken }, 'Logged in successfully.'));
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(errorResponse('Refresh token is required.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json(errorResponse('Invalid or expired refresh token.'));
    }

    const stored = await query(
      `SELECT token_id, revoked, expires_at FROM refresh_tokens WHERE token = $1 AND user_id = $2`,
      [refreshToken, decoded.userId]
    );

    if (stored.rows.length === 0 || stored.rows[0].revoked) {
      return res.status(401).json(errorResponse('Refresh token is no longer valid.'));
    }

    const userResult = await query(
      'SELECT user_id, username, email, role, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json(errorResponse('User account unavailable.'));
    }

    const user = userResult.rows[0];
    const newAccessToken = signAccessToken(user);

    res.json(successResponse({ accessToken: newAccessToken }, 'Token refreshed.'));
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [refreshToken]);
    }
    if (req.user) {
      await logActivity(req.user.user_id, 'logout', 'user', req.user.user_id, 'User logged out', req);
    }
    res.json(successResponse(null, 'Logged out successfully.'));
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT user_id, username, email, first_name, last_name, role, bio, avatar, created_at, last_login
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json(errorResponse('Current password is incorrect.'));
    }
    const newHash = await bcrypt.hash(newPassword, ROUNDS);
    await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, req.user.user_id]);
    await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.user_id]);
    res.json(successResponse(null, 'Password updated. Please log in again.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout, me, changePassword, logActivity };
