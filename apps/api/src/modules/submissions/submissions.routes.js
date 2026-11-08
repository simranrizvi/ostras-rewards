import { rateLimit } from 'express-rate-limit';
import { validateSubmissionId } from '../../middleware/security.js';
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as controller from './submissions.controller.js';

const router = Router();
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Upload limit reached. Please try again later.' },
});
router.param('submissionId', validateSubmissionId);
router.get('/:submissionId/image', requireAuth, controller.viewImage);
router.get('/rewards/mine', requireAuth, controller.memberRewards);
router.get('/mine', requireAuth, controller.listMine);
router.post(
  '/upload',
  requireAuth,
  uploadLimiter,
  upload.single('image'),
  controller.uploadPhoto,
);
router.get('/automation/status', requireAuth, controller.automationStatus);
router.post('/automation/result', controller.automationResult);
router.get('/admin/all', requireAuth, requireAdmin, controller.listAdmin);
router.patch(
  '/admin/:submissionId/review',
  requireAuth,
  requireAdmin,
  controller.reviewSubmission,
);
router.get('/admin/rewards', requireAuth, requireAdmin, controller.listRewards);

export default router;
