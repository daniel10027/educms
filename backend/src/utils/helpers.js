const crypto = require('crypto');

const slugify = (text) => {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateUniqueSlug = async (text, checkExistsCallback) => {
  let slug = slugify(text);
  if (!slug) slug = 'item';
  let exists = await checkExistsCallback(slug);
  if (exists) {
    const randomString = crypto.randomBytes(3).toString('hex');
    slug = `${slug}-${randomString}`;
  }
  return slug;
};

const paginate = (page = 1, limit = 10, maxLimit = 100) => {
  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 10;
  if (limit > maxLimit) limit = maxLimit;
  if (limit < 1) limit = 10;
  if (page < 1) page = 1;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
  return {
    currentPage: parseInt(page, 10),
    totalPages,
    totalItems,
    itemsPerPage: parseInt(limit, 10),
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

const successResponse = (data, message = 'Success', meta = null) => {
  const response = { success: true, message, data };
  if (meta) response.meta = meta;
  return response;
};

const errorResponse = (message, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return response;
};

const calculateReadingTime = (text) => {
  const plain = String(text || '').replace(/<[^>]*>/g, ' ');
  const wordCount = plain.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(Math.ceil(wordCount / 200), 1);
};

const extractExcerpt = (content, length = 200) => {
  const text = String(content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '…';
};

const generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

module.exports = {
  slugify,
  generateUniqueSlug,
  paginate,
  getPaginationMeta,
  successResponse,
  errorResponse,
  calculateReadingTime,
  extractExcerpt,
  generateToken,
};
