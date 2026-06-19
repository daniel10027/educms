const express = require('express');
const router = express.Router();

const mediaController = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', authenticate, authorize('admin', 'editor', 'author'), mediaController.listMedia);
router.post('/', authenticate, authorize('admin', 'editor', 'author'), upload.single('file'), mediaController.uploadFile);
router.put('/:id', authenticate, authorize('admin', 'editor', 'author'), mediaController.updateMedia);
router.delete('/:id', authenticate, authorize('admin', 'editor'), mediaController.deleteMedia);

module.exports = router;
