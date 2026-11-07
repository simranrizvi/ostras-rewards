import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { Reward } from '../models/Reward.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { automationConfigured } from '../services/automation.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const [submissionCount, rewards, recentRewards, recentSubmissions, pendingCount] = await Promise.all([
    Submission.countDocuments({ userId: req.user._id }),
    Reward.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
    Reward.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(8).lean(),
    Submission.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(6).lean(),
    Submission.countDocuments({ userId: req.user._id, status: { $in: ['processing', 'pending_review'] } }),
  ]);
  const points = rewards[0]?.total || 0;
  res.json({ user: req.user, submissionCount, points, pendingCount, recentRewards, recentSubmissions, automationConfigured: automationConfigured() });
});

router.get('/admin', requireAuth, requireAdmin, async (_req, res) => {
  const [users, submissions, points, latest] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Submission.countDocuments(),
    Reward.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]),
    Submission.find().populate('userId', 'fullName email').sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  const statuses = await Submission.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  res.json({ users, submissions, pointsIssued: points[0]?.total || 0, statuses, latest });
});

export default router;
