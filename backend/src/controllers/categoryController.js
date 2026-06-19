const { query } = require('../config/database');
const { successResponse, errorResponse, generateUniqueSlug } = require('../utils/helpers');
const { logActivity } = require('./authController');

const checkSlugExists = async (slug, excludeId = null) => {
  const sql = excludeId
    ? 'SELECT 1 FROM categories WHERE slug = $1 AND category_id != $2'
    : 'SELECT 1 FROM categories WHERE slug = $1';
  const params = excludeId ? [slug, excludeId] : [slug];
  const result = await query(sql, params);
  return result.rows.length > 0;
};

const listCategories = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, get_category_post_count(c.category_id) AS post_count
       FROM categories c
       WHERE c.is_active = true
       ORDER BY c.display_order ASC, c.name ASC`
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await query(
      `SELECT c.*, get_category_post_count(c.category_id) AS post_count FROM categories c WHERE c.slug = $1`,
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Category not found.'));
    }
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description, parentId, displayOrder = 0 } = req.body;
    const slug = await generateUniqueSlug(name, (s) => checkSlugExists(s));
    const result = await query(
      `INSERT INTO categories (name, slug, description, parent_id, display_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, description || null, parentId || null, displayOrder]
    );
    await logActivity(req.user.user_id, 'create', 'category', result.rows[0].category_id, `Created category "${name}"`, req);
    res.status(201).json(successResponse(result.rows[0], 'Category created successfully.'));
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM categories WHERE category_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Category not found.'));
    }
    const current = existing.rows[0];
    const { name, description, parentId, displayOrder, isActive } = req.body;

    let slug = current.slug;
    if (name && name !== current.name) {
      slug = await generateUniqueSlug(name, (s) => checkSlugExists(s, id));
    }

    const result = await query(
      `UPDATE categories SET name=$1, slug=$2, description=$3, parent_id=$4, display_order=$5, is_active=$6
       WHERE category_id=$7 RETURNING *`,
      [
        name || current.name, slug,
        description !== undefined ? description : current.description,
        parentId !== undefined ? parentId : current.parent_id,
        displayOrder !== undefined ? displayOrder : current.display_order,
        isActive !== undefined ? isActive : current.is_active,
        id,
      ]
    );
    await logActivity(req.user.user_id, 'update', 'category', id, `Updated category "${result.rows[0].name}"`, req);
    res.json(successResponse(result.rows[0], 'Category updated successfully.'));
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT name FROM categories WHERE category_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Category not found.'));
    }
    await query('DELETE FROM categories WHERE category_id = $1', [id]);
    await logActivity(req.user.user_id, 'delete', 'category', id, `Deleted category "${existing.rows[0].name}"`, req);
    res.json(successResponse(null, 'Category deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
