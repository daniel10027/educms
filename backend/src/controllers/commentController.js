const { query } = require('../config/database');
const { successResponse, errorResponse, paginate, getPaginationMeta } = require('../utils/helpers');
const { logActivity } = require('./authController');

const listCommentsForPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const result = await query(
      `SELECT c.*, u.username, u.first_name, u.last_name, u.avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       WHERE c.post_id = $1 AND c.status = 'approved'
       ORDER BY c.created_at ASC`,
      [postId]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    next(error);
  }
};

const listAllComments = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;
    if (status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(status);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM comments c ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT c.*, u.username, p.title AS post_title, p.slug AS post_slug
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN posts p ON c.post_id = p.post_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json(successResponse(dataResult.rows, 'Comments retrieved.', getPaginationMeta(total, page, limit)));
  } catch (error) {
    next(error);
  }
};

const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;

    const post = await query('SELECT allow_comments, status FROM posts WHERE post_id = $1', [postId]);
    if (post.rows.length === 0) {
      return res.status(404).json(errorResponse('Post not found.'));
    }
    if (!post.rows[0].allow_comments) {
      return res.status(403).json(errorResponse('Comments are disabled for this post.'));
    }

    // Auto-approve for staff, otherwise queue for moderation.
    const status = req.user && ['admin', 'editor'].includes(req.user.role) ? 'approved' : 'pending';

    const result = await query(
      `INSERT INTO comments (post_id, user_id, parent_id, content, status, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [postId, req.user ? req.user.user_id : null, parentId || null, content, status, req.ip, req.headers['user-agent']]
    );

    res.status(201).json(successResponse(result.rows[0], status === 'approved'
      ? 'Comment posted.'
      : 'Comment submitted and is awaiting moderation.'));
  } catch (error) {
    next(error);
  }
};

const moderateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'spam', 'trash', 'pending'].includes(status)) {
      return res.status(400).json(errorResponse('Invalid status.'));
    }
    const result = await query('UPDATE comments SET status = $1 WHERE comment_id = $2 RETURNING *', [status, id]);
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Comment not found.'));
    }
    await logActivity(req.user.user_id, 'moderate', 'comment', id, `Set comment status to ${status}`, req);
    res.json(successResponse(result.rows[0], 'Comment updated.'));
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM comments WHERE comment_id = $1 RETURNING comment_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Comment not found.'));
    }
    res.json(successResponse(null, 'Comment deleted.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { listCommentsForPost, listAllComments, createComment, moderateComment, deleteComment };
