const logger = require('../utils/logger');
const { errorResponse } = require('../utils/helpers');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  // Postgres unique violation
  if (err.code === '23505') {
    const field = err.detail ? err.detail.match(/\(([^)]+)\)=/)?.[1] : 'field';
    return res.status(409).json(errorResponse(`This ${field || 'value'} is already in use.`));
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(409).json(errorResponse('This action references a record that does not exist.'));
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(errorResponse('File is too large.'));
  }

  if (err.message && err.message.includes('not allowed')) {
    return res.status(415).json(errorResponse(err.message));
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;

  res.status(statusCode).json(errorResponse(message));
};

const notFoundHandler = (req, res) => {
  res.status(404).json(errorResponse(`Route ${req.method} ${req.originalUrl} not found.`));
};

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, notFoundHandler, ApiError };
