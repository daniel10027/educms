const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.get('/dashboard', authenticate, authorize('admin', 'editor', 'author'), userController.dashboardStats);
router.get('/', authenticate, authorize('admin'), userController.listUsers);
router.get('/:id/stats', authenticate, authorize('admin', 'editor'), userController.getUserStats);

router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('bio').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  userController.updateProfile
);

router.patch('/:id/role', authenticate, authorize('admin'), userController.updateUserRole);
router.patch('/:id/toggle-active', authenticate, authorize('admin'), userController.toggleUserActive);

module.exports = router;
