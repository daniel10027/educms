const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

/**
 * Runs after a chain of express-validator checks; returns 422 with
 * field-level details if any failed.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return res.status(422).json(errorResponse('Validation failed.', formatted));
  }
  next();
};

module.exports = { validate };
