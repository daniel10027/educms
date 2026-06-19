const { query, transaction } = require('../config/database');
const { cache } = require('../config/redis');
const {
  successResponse,
  errorResponse,
  paginate,
  getPaginationMeta,
  generateUniqueSlug,
  calculateReadingTime,
  extractExcerpt,
} = require('../utils/helpers');
const { logActivity } = require('./authController');

const checkSlugExists = async (slug, excludePostId = null) => {
  const params = excludePostId ? [slug, excludePostId] : [slug];
  const sql = excludePostId
    ? 'SELECT 1 FROM posts WHERE slug = $1 AND post_id != $2'
    : 'SELECT 1 FROM posts WHERE slug = $1';
  const result = await query(sql, params);
  return result.rows.length > 0;
};

const listPosts = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, category, tag, author, search, featured, sort = 'recent' } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    // Public callers only see published posts; authenticated staff can filter by status.
    if (req.user && ['admin', 'editor', 'author'].includes(req.user.role) && status) {
      conditions.push(`p.status = $${idx++}`);
      params.push(status);
    } else if (!req.user || !['admin', 'editor', 'author'].includes(req.user.role)) {
      conditions.push(`p.status = 'published'`);
    }

    if (category) {
      conditions.push(`c.slug = $${idx++}`);
      params.push(category);
    }
    if (author) {
      conditions.push(`u.username = $${idx++}`);
      params.push(author);
    }
    if (featured === 'true') {
      conditions.push(`p.is_featured = true`);
    }
    if (tag) {
      conditions.push(`p.post_id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON pt.tag_id = t.tag_id WHERE t.slug = $${idx++})`);
      params.push(tag);
    }
    if (search) {
      conditions.push(`p.search_vector @@ plainto_tsquery('french', $${idx++})`);
      params.push(search);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const orderBy = {
      recent: 'p.created_at DESC',
      published: 'p.published_at DESC NULLS LAST',
      popular: 'p.view_count DESC',
      title: 'p.title ASC',
    }[sort] || 'p.created_at DESC';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.author_id = u.user_id
      ${whereClause}`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataSql = `
      SELECT
        p.post_id, p.title, p.slug, p.excerpt, p.status, p.featured_image,
        p.view_count, p.like_count, p.created_at, p.updated_at, p.published_at,
        p.is_featured, p.reading_time,
        u.user_id AS author_id, u.username AS author_username, u.first_name AS author_first_name, u.last_name AS author_last_name, u.avatar AS author_avatar,
        c.category_id, c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.author_id = u.user_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++}`;
    const dataResult = await query(dataSql, [...params, limit, offset]);

    res.json(successResponse(dataResult.rows, 'Posts retrieved.', getPaginationMeta(total, page, limit)));
  } catch (error) {
    next(error);
  }
};

const getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cacheKey = `post:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(successResponse(cached, 'Post retrieved.'));
    }

    const result = await query(
      `SELECT
        p.*, u.username AS author_username, u.first_name AS author_first_name, u.last_name AS author_last_name, u.avatar AS author_avatar, u.bio AS author_bio,
        c.name AS category_name, c.slug AS category_slug
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Post not found.'));
    }

    const post = result.rows[0];

    if (post.status !== 'published' && (!req.user || !['admin', 'editor', 'author'].includes(req.user.role))) {
      return res.status(404).json(errorResponse('Post not found.'));
    }

    const tagsResult = await query(
      `SELECT t.tag_id, t.name, t.slug FROM tags t
       JOIN post_tags pt ON t.tag_id = pt.tag_id
       WHERE pt.post_id = $1`,
      [post.post_id]
    );
    post.tags = tagsResult.rows;

    if (post.status === 'published') {
      query('UPDATE posts SET view_count = view_count + 1 WHERE post_id = $1', [post.post_id]).catch(() => {});
      await cache.set(cacheKey, post, 600);
    }

    res.json(successResponse(post, 'Post retrieved.'));
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT
        p.*, u.username AS author_username, u.first_name AS author_first_name, u.last_name AS author_last_name,
        c.name AS category_name, c.slug AS category_slug
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.post_id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Post not found.'));
    }
    const post = result.rows[0];

    if (req.user.role === 'author' && post.author_id !== req.user.user_id) {
      return res.status(403).json(errorResponse('You can only view your own drafts.'));
    }

    const tagsResult = await query(
      `SELECT t.tag_id, t.name, t.slug FROM tags t
       JOIN post_tags pt ON t.tag_id = pt.tag_id
       WHERE pt.post_id = $1`,
      [post.post_id]
    );
    post.tags = tagsResult.rows;

    res.json(successResponse(post));
  } catch (error) {
    next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const {
      title, content, excerpt, categoryId, status = 'draft',
      tags = [], featuredImage, metaTitle, metaDescription, metaKeywords,
      isFeatured = false, allowComments = true,
    } = req.body;

    const slug = await generateUniqueSlug(title, (s) => checkSlugExists(s));
    const finalExcerpt = excerpt || extractExcerpt(content);
    const readingTime = calculateReadingTime(content);
    const publishedAt = status === 'published' ? new Date() : null;

    const result = await transaction(async (client) => {
      const postResult = await client.query(
        `INSERT INTO posts (
          title, slug, content, excerpt, author_id, category_id, status,
          featured_image, meta_title, meta_description, meta_keywords,
          is_featured, allow_comments, reading_time, published_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *`,
        [
          title, slug, content, finalExcerpt, req.user.user_id, categoryId || null, status,
          featuredImage || null, metaTitle || title, metaDescription || finalExcerpt, metaKeywords || null,
          isFeatured, allowComments, readingTime, publishedAt,
        ]
      );
      const post = postResult.rows[0];

      if (Array.isArray(tags) && tags.length > 0) {
        for (const tagId of tags) {
          await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [post.post_id, tagId]);
        }
      }

      await client.query(
        `INSERT INTO post_revisions (post_id, title, content, excerpt, edited_by) VALUES ($1,$2,$3,$4,$5)`,
        [post.post_id, title, content, finalExcerpt, req.user.user_id]
      );

      return post;
    });

    await logActivity(req.user.user_id, 'create', 'post', result.post_id, `Created post "${title}"`, req);
    res.status(201).json(successResponse(result, 'Post created successfully.'));
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM posts WHERE post_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Post not found.'));
    }
    const current = existing.rows[0];

    if (req.user.role === 'author' && current.author_id !== req.user.user_id) {
      return res.status(403).json(errorResponse('You can only edit your own posts.'));
    }

    const {
      title, content, excerpt, categoryId, status, tags,
      featuredImage, metaTitle, metaDescription, metaKeywords,
      isFeatured, allowComments,
    } = req.body;

    let slug = current.slug;
    if (title && title !== current.title) {
      slug = await generateUniqueSlug(title, (s) => checkSlugExists(s, id));
    }

    const newStatus = status || current.status;
    const publishedAt = newStatus === 'published' && current.status !== 'published'
      ? new Date()
      : current.published_at;

    const newContent = content !== undefined ? content : current.content;
    const newExcerpt = excerpt !== undefined ? excerpt : (content ? extractExcerpt(content) : current.excerpt);
    const readingTime = content ? calculateReadingTime(content) : current.reading_time;

    const result = await transaction(async (client) => {
      const updated = await client.query(
        `UPDATE posts SET
          title = $1, slug = $2, content = $3, excerpt = $4, category_id = $5,
          status = $6, featured_image = $7, meta_title = $8, meta_description = $9,
          meta_keywords = $10, is_featured = $11, allow_comments = $12,
          reading_time = $13, published_at = $14
         WHERE post_id = $15 RETURNING *`,
        [
          title || current.title, slug, newContent, newExcerpt,
          categoryId !== undefined ? categoryId : current.category_id,
          newStatus, featuredImage !== undefined ? featuredImage : current.featured_image,
          metaTitle !== undefined ? metaTitle : current.meta_title,
          metaDescription !== undefined ? metaDescription : current.meta_description,
          metaKeywords !== undefined ? metaKeywords : current.meta_keywords,
          isFeatured !== undefined ? isFeatured : current.is_featured,
          allowComments !== undefined ? allowComments : current.allow_comments,
          readingTime, publishedAt, id,
        ]
      );

      if (Array.isArray(tags)) {
        await client.query('DELETE FROM post_tags WHERE post_id = $1', [id]);
        for (const tagId of tags) {
          await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, tagId]);
        }
      }

      if (content && content !== current.content) {
        await client.query(
          `INSERT INTO post_revisions (post_id, title, content, excerpt, edited_by) VALUES ($1,$2,$3,$4,$5)`,
          [id, title || current.title, newContent, newExcerpt, req.user.user_id]
        );
      }

      return updated.rows[0];
    });

    await cache.del(`post:${current.slug}`);
    if (slug !== current.slug) await cache.del(`post:${slug}`);

    await logActivity(req.user.user_id, 'update', 'post', id, `Updated post "${result.title}"`, req);
    res.json(successResponse(result, 'Post updated successfully.'));
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT slug, author_id, title FROM posts WHERE post_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(errorResponse('Post not found.'));
    }
    if (req.user.role === 'author' && existing.rows[0].author_id !== req.user.user_id) {
      return res.status(403).json(errorResponse('You can only delete your own posts.'));
    }

    await query('DELETE FROM posts WHERE post_id = $1', [id]);
    await cache.del(`post:${existing.rows[0].slug}`);
    await logActivity(req.user.user_id, 'delete', 'post', id, `Deleted post "${existing.rows[0].title}"`, req);
    res.json(successResponse(null, 'Post deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

const getPostRevisions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT r.revision_id, r.title, r.created_at, u.username AS edited_by_username
       FROM post_revisions r
       LEFT JOIN users u ON r.edited_by = u.user_id
       WHERE r.post_id = $1 ORDER BY r.created_at DESC`,
      [id]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    next(error);
  }
};

const restoreRevision = async (req, res, next) => {
  try {
    const { id, revisionId } = req.params;
    const revisionResult = await query('SELECT * FROM post_revisions WHERE revision_id = $1 AND post_id = $2', [revisionId, id]);
    if (revisionResult.rows.length === 0) {
      return res.status(404).json(errorResponse('Revision not found.'));
    }
    const revision = revisionResult.rows[0];
    const result = await query(
      `UPDATE posts SET title = $1, content = $2, excerpt = $3 WHERE post_id = $4 RETURNING *`,
      [revision.title, revision.content, revision.excerpt, id]
    );
    await logActivity(req.user.user_id, 'restore', 'post', id, `Restored post to revision #${revisionId}`, req);
    res.json(successResponse(result.rows[0], 'Revision restored.'));
  } catch (error) {
    next(error);
  }
};

const likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE posts SET like_count = like_count + 1 WHERE post_id = $1 RETURNING like_count', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('Post not found.'));
    }
    res.json(successResponse({ likeCount: result.rows[0].like_count }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getPostRevisions,
  restoreRevision,
  likePost,
};
