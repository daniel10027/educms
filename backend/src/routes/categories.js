const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.get('/', categoryController.listCategories);
router.get('/:slug', categoryController.getCategory);

router.post(
  '/',
  authenticate,
  authorize('admin', 'editor'),
  [body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 })],
  validate,
  categoryController.createCategory
);

router.put('/:id', authenticate, authorize('admin', 'editor'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
