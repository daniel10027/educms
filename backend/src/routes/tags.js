const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const tagController = require('../controllers/tagController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.get('/', tagController.listTags);

router.post(
  '/',
  authenticate,
  authorize('admin', 'editor', 'author'),
  [body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 50 })],
  validate,
  tagController.createTag
);

router.put('/:id', authenticate, authorize('admin', 'editor'), tagController.updateTag);
router.delete('/:id', authenticate, authorize('admin', 'editor'), tagController.deleteTag);

module.exports = router;
