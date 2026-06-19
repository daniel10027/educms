const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const postController = require('../controllers/postController');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

router.get('/', optionalAuthenticate, postController.listPosts);

router.get('/by-id/:id', authenticate, authorize('admin', 'editor', 'author'), postController.getPostById);

router.get('/:slug', optionalAuthenticate, postController.getPostBySlug);

router.post(
  '/',
  authenticate,
  authorize('admin', 'editor', 'author'),
  [
    body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 255 }),
    body('content').trim().notEmpty().withMessage('Content is required.'),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('categoryId').optional({ nullable: true }).isInt(),
    body('tags').optional().isArray(),
  ],
  validate,
  postController.createPost
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'editor', 'author'),
  [
    param('id').isInt(),
    body('title').optional().trim().isLength({ max: 255 }),
    body('status').optional().isIn(['draft', 'published', 'archived']),
  ],
  validate,
  postController.updatePost
);

router.delete('/:id', authenticate, authorize('admin', 'editor', 'author'), postController.deletePost);

router.get('/:id/revisions', authenticate, authorize('admin', 'editor', 'author'), postController.getPostRevisions);
router.post('/:id/revisions/:revisionId/restore', authenticate, authorize('admin', 'editor', 'author'), postController.restoreRevision);

router.post('/:id/like', postController.likePost);

module.exports = router;
