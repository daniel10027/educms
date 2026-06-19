const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { successResponse, errorResponse, paginate, getPaginationMeta } = require('../utils/helpers');
const { logActivity } = require('./authController');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

const listUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { role } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;
    if (role) {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT user_id, username, email, first_name, last_name, role, is_active, email_verified, created_at, last_login
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json(successResponse(dataResult.rows, 'Users retrieved.', getPaginationMeta(total, page, limit)));
  } catch (error) {
    next(error);
  }
};

const getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM user_statistics WHERE user_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('User not found.'));
    }
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'editor', 'author', 'subscriber'].includes(role)) {
      return res.status(400).json(errorResponse('Invalid role.'));
    }
    if (parseInt(id, 10) === req.user.user_id) {
      return res.status(400).json(errorResponse('You cannot change your own role.'));
    }
    const result = await query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, username, role',
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('User not found.'));
    }
    await logActivity(req.user.user_id, 'update', 'user', id, `Changed role to ${role}`, req);
    res.json(successResponse(result.rows[0], 'User role updated.'));
  } catch (error) {
    next(error);
  }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.user_id) {
      return res.status(400).json(errorResponse('You cannot deactivate your own account.'));
    }
    const result = await query(
      'UPDATE users SET is_active = NOT is_active WHERE user_id = $1 RETURNING user_id, username, is_active',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('User not found.'));
    }
    res.json(successResponse(result.rows[0], 'User status updated.'));
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, bio, avatar } = req.body;
    const result = await query(
      `UPDATE users SET first_name = $1, last_name = $2, bio = $3, avatar = $4 WHERE user_id = $5
       RETURNING user_id, username, email, first_name, last_name, role, bio, avatar`,
      [firstName, lastName, bio, avatar, req.user.user_id]
    );
    res.json(successResponse(result.rows[0], 'Profile updated.'));
  } catch (error) {
    next(error);
  }
};

const dashboardStats = async (req, res, next) => {
  try {
    const [posts, comments, users, views] = await Promise.all([
      query(`SELECT status, COUNT(*) AS count FROM posts GROUP BY status`),
      query(`SELECT status, COUNT(*) AS count FROM comments GROUP BY status`),
      query(`SELECT COUNT(*) AS count FROM users`),
      query(`SELECT COALESCE(SUM(view_count), 0) AS total FROM posts`),
    ]);

    const recentPosts = await query(
      `SELECT post_id, title, slug, status, view_count, created_at FROM posts ORDER BY created_at DESC LIMIT 5`
    );
    const recentComments = await query(
      `SELECT c.comment_id, c.content, c.status, c.created_at, p.title AS post_title
       FROM comments c LEFT JOIN posts p ON c.post_id = p.post_id
       ORDER BY c.created_at DESC LIMIT 5`
    );
    const topPosts = await query(
      `SELECT post_id, title, slug, view_count FROM posts WHERE status = 'published' ORDER BY view_count DESC LIMIT 5`
    );

    res.json(successResponse({
      posts: posts.rows,
      comments: comments.rows,
      totalUsers: parseInt(users.rows[0].count, 10),
      totalViews: parseInt(views.rows[0].total, 10),
      recentPosts: recentPosts.rows,
      recentComments: recentComments.rows,
      topPosts: topPosts.rows,
    }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUserStats,
  updateUserRole,
  toggleUserActive,
  updateProfile,
  dashboardStats,
};
