const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { query } = require('../config/database');
const { successResponse, errorResponse, paginate, getPaginationMeta } = require('../utils/helpers');
const { uploadDir } = require('../middleware/upload');
const { logActivity } = require('./authController');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('No file provided.'));
    }

    let width = null;
    let height = null;

    if (req.file.mimetype.startsWith('image/')) {
      try {
        const metadata = await sharp(req.file.path).metadata();
        width = metadata.width;
        height = metadata.height;

        // Generate a web-friendly thumbnail alongside the original.
        const thumbName = `thumb-${req.file.filename}`;
        await sharp(req.file.path)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .toFile(path.join(uploadDir, thumbName));
      } catch (err) {
        // Non-fatal: keep the original upload even if thumbnailing fails.
      }
    }

    const result = await query(
      `INSERT INTO media (filename, original_name, file_path, file_type, file_size, mime_type, uploaded_by, alt_text, caption, width, height)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        req.file.filename,
        req.file.originalname,
        `/uploads/${req.file.filename}`,
        req.file.mimetype.split('/')[0],
        req.file.size,
        req.file.mimetype,
        req.user.user_id,
        req.body.altText || null,
        req.body.caption || null,
        width,
        height,
      ]
    );

    await logActivity(req.user.user_id, 'upload', 'media', result.rows[0].media_id, `Uploaded ${req.file.originalname}`, req);
    res.status(201).json(successResponse(result.rows[0], 'File uploaded successfully.'));
  } catch (error) {
    next(error);
  }
};

const listMedia = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { type } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;
    if (type) {
      conditions.push(`file_type = $${idx++}`);
      params.push(type);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM media ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT m.*, u.username AS uploaded_by_username
       FROM media m
       LEFT JOIN users u ON m.uploaded_by = u.user_id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    res.json(successResponse(dataResult.rows, 'Media retrieved.', getPaginationMeta(total, page, limit)));
  } catch (error) {
    next(error);
  }
};

const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { altText, caption } = req.body;
    const result = await query(
      'UPDATE media SET alt_text = $1, caption = $2 WHERE media_id = $3 RETURNING *',
      [altText, caption, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Media not found.'));
    }
    res.json(successResponse(result.rows[0], 'Media updated.'));
  } catch (error) {
    next(error);
  }
};

const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT filename FROM media WHERE media_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Media not found.'));
    }

    const filePath = path.join(uploadDir, existing.rows[0].filename);
    const thumbPath = path.join(uploadDir, `thumb-${existing.rows[0].filename}`);
    [filePath, thumbPath].forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    await query('DELETE FROM media WHERE media_id = $1', [id]);
    await logActivity(req.user.user_id, 'delete', 'media', id, `Deleted media file`, req);
    res.json(successResponse(null, 'Media deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadFile, listMedia, updateMedia, deleteMedia };
