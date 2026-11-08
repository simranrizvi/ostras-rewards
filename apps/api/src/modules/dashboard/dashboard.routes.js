import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import * as controller from './dashboard.controller.js';

const router = Router();
router.get('/me', requireAuth, controller.memberDashboard);
router.get('/admin', requireAuth, requireAdmin, controller.adminDashboard);

export default router;
