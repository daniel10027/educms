const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const commentController = require('../controllers/commentController');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.get('/post/:postId', commentController.listCommentsForPost);

router.get('/', authenticate, authorize('admin', 'editor'), commentController.listAllComments);

router.post(
  '/post/:postId',
  optionalAuthenticate,
  [body('content').trim().notEmpty().withMessage('Comment cannot be empty.').isLength({ max: 2000 })],
  validate,
  commentController.createComment
);

router.patch('/:id/moderate', authenticate, authorize('admin', 'editor'), commentController.moderateComment);
router.delete('/:id', authenticate, authorize('admin', 'editor'), commentController.deleteComment);

module.exports = router;
