const { query } = require('../config/database');
const { successResponse, errorResponse, generateUniqueSlug } = require('../utils/helpers');
const { logActivity } = require('./authController');

const checkSlugExists = async (slug, excludeId = null) => {
  const sql = excludeId
    ? 'SELECT 1 FROM tags WHERE slug = $1 AND tag_id != $2'
    : 'SELECT 1 FROM tags WHERE slug = $1';
  const params = excludeId ? [slug, excludeId] : [slug];
  const result = await query(sql, params);
  return result.rows.length > 0;
};

const listTags = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*, COUNT(pt.post_id) AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON t.tag_id = pt.tag_id
       GROUP BY t.tag_id
       ORDER BY t.name ASC`
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    next(error);
  }
};

const createTag = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const slug = await generateUniqueSlug(name, (s) => checkSlugExists(s));
    const result = await query(
      'INSERT INTO tags (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description || null]
    );
    await logActivity(req.user.user_id, 'create', 'tag', result.rows[0].tag_id, `Created tag "${name}"`, req);
    res.status(201).json(successResponse(result.rows[0], 'Tag created successfully.'));
  } catch (error) {
    next(error);
  }
};

const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM tags WHERE tag_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Tag not found.'));
    }
    const current = existing.rows[0];
    const { name, description } = req.body;
    let slug = current.slug;
    if (name && name !== current.name) {
      slug = await generateUniqueSlug(name, (s) => checkSlugExists(s, id));
    }
    const result = await query(
      'UPDATE tags SET name=$1, slug=$2, description=$3 WHERE tag_id=$4 RETURNING *',
      [name || current.name, slug, description !== undefined ? description : current.description, id]
    );
    res.json(successResponse(result.rows[0], 'Tag updated successfully.'));
  } catch (error) {
    next(error);
  }
};

const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT name FROM tags WHERE tag_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Tag not found.'));
    }
    await query('DELETE FROM tags WHERE tag_id = $1', [id]);
    await logActivity(req.user.user_id, 'delete', 'tag', id, `Deleted tag "${existing.rows[0].name}"`, req);
    res.json(successResponse(null, 'Tag deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { listTags, createTag, updateTag, deleteTag };
