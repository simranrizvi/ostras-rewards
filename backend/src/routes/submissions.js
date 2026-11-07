import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { Reward } from '../models/Reward.js';
import { Submission } from '../models/Submission.js';
import { automationConfigured, isValidWorkflowSecret, sendSubmissionToN8n } from '../services/automation.js';
import { readExpiryDate } from '../services/expiry-ocr.js';
import { decideSubmission } from '../services/review.js';

const router = Router();
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp']]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${allowed.get(file.mimetype) || '.img'}`),
});
const upload = multer({ storage, limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => cb(null, allowed.has(file.mimetype)) });

router.get('/mine', requireAuth, async (req, res) => {
  const [submissions, rewards, totals] = await Promise.all([
    Submission.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Reward.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Reward.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
  ]);
  res.json({ submissions, rewards, points: totals[0]?.total || 0 });
});

router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(422).json({ error: 'Upload a JPG, PNG, or WEBP product photo.' });
  const imageUrl = `${env.API_PUBLIC_URL.replace(/\/$/, '')}/uploads/${req.file.filename}`;
  const submission = await Submission.create({
    userId: req.user._id, imageUrl, imagePath: req.file.filename,
    originalFileName: req.file.originalname.slice(0, 180),
    status: automationConfigured() ? 'processing' : 'pending_review',
  });
  if (automationConfigured()) {
    try {
      const expiryInfo = await readExpiryDate(submission.imagePath);
      Object.assign(submission, expiryInfo);
      await submission.save();
      await sendSubmissionToN8n(submission);
    } catch (error) {
      await Submission.updateOne({ _id: submission._id }, { $set: { status: 'pending_review', reviewNote: `n8n could not be reached: ${error.message.slice(0, 220)}` } });
      submission.status = 'pending_review';
    }
  }
  return res.status(201).json({ submission, message: submission.status === 'processing' ? 'Photo uploaded. Checking the expiry date now.' : 'Photo uploaded. It is waiting for admin review.' });
});

router.get('/automation/status', requireAuth, (_req, res) => res.json({ configured: automationConfigured() }));

router.post('/automation/result', async (req, res) => {
  if (!isValidWorkflowSecret(req.get('x-automation-secret'))) return res.status(401).json({ error: 'Invalid workflow secret.' });
  const parsed = z.object({ submissionId: z.string().min(1), expiryDate: z.string().nullable(), confidence: z.number().min(0).max(1), isExpired: z.boolean(), note: z.string().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'The workflow result is invalid.' });
  try {
    if (parsed.data.expiryDate) {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const backendExpired = new Date(`${parsed.data.expiryDate}T00:00:00.000Z`) < today;
      if (backendExpired !== parsed.data.isExpired) return res.status(409).json({ error: 'The workflow date comparison did not match the backend date check.' });
    }
    const submission = await decideSubmission(parsed.data);
    return res.json({ success: true, status: submission.status, userId: String(submission.userId), pointsAwarded: submission.pointsAwarded });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Could not process workflow result.' });
  }
});

router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  const filter = req.query.status && ['processing', 'pending_review', 'approved', 'rejected', 'expired', 'failed'].includes(req.query.status) ? { status: req.query.status } : {};
  const submissions = await Submission.find(filter).populate('userId', 'fullName email').sort({ createdAt: -1 }).limit(200).lean();
  res.json({ submissions });
});

router.patch('/admin/:submissionId/review', requireAuth, requireAdmin, async (req, res) => {
  const parsed = z.object({ decision: z.enum(['approve', 'reject']), expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), points: z.coerce.number().int().min(1).max(100000).optional(), note: z.string().trim().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Choose approve or reject and provide a valid expiry date to approve.' });
  try {
    if (parsed.data.decision === 'reject') {
      const updated = await Submission.findOneAndUpdate({ _id: req.params.submissionId, status: { $in: ['processing', 'pending_review'] } }, { $set: { status: 'rejected', reviewNote: parsed.data.note || 'Rejected by an administrator.', reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true });
      if (!updated) return res.status(409).json({ error: 'This submission has already been reviewed.' });
      return res.json({ submission: updated });
    }
    if (!parsed.data.expiryDate) return res.status(422).json({ error: 'Enter the expiry date printed on the product before approving.' });
    const submission = await decideSubmission({ submissionId: req.params.submissionId, expiryDate: parsed.data.expiryDate, confidence: 1, note: parsed.data.note || 'Reviewed by an administrator.', reviewerId: req.user._id, points: parsed.data.points || env.REWARD_POINTS });
    return res.json({ submission });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Could not review this submission.' });
  }
});

router.get('/admin/rewards', requireAuth, requireAdmin, async (_req, res) => {
  const rewards = await Reward.find().populate('userId', 'fullName email').populate('submissionId', 'originalFileName expiryDate').sort({ createdAt: -1 }).limit(250).lean();
  res.json({ rewards });
});

export default router;
