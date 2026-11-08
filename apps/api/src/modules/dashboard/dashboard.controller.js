import { Reward } from '../rewards/reward.model.js';
import { Submission } from '../submissions/submission.model.js';
import { User } from '../users/user.model.js';
import { automationConfigured } from '../../integrations/n8n.client.js';

export const memberDashboard = async (req, res) => {
  const [
    submissionCount,
    rewards,
    recentRewards,
    recentSubmissions,
    pendingCount,
  ] = await Promise.all([
    Submission.countDocuments({ userId: req.user._id }),
    Reward.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]),
    Reward.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    Submission.find({ userId: req.user._id })
      .select('-imagePath -imageHash')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Submission.countDocuments({
      userId: req.user._id,
      status: { $in: ['processing', 'pending_review'] },
    }),
  ]);
  const points = rewards[0]?.total || 0;
  res.json({
    user: req.user,
    submissionCount,
    points,
    pendingCount,
    recentRewards,
    recentSubmissions,
    automationConfigured: automationConfigured(),
  });
};

export const adminDashboard = async (_req, res) => {
  const [users, submissions, points, latest] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Submission.countDocuments(),
    Reward.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]),
    Submission.find()
      .select('-imagePath -imageHash')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);
  const statuses = await Submission.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json({
    users,
    submissions,
    pointsIssued: points[0]?.total || 0,
    statuses,
    latest,
  });
};
