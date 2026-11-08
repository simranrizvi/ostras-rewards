import sharp from 'sharp';
import { uploadDirectory } from '../../config/env.js';
import { pagination, pageMeta } from '../../shared/pagination.js';
import { parseCalendarDate, isExpiredDate } from '../../shared/date.js';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { Reward } from '../rewards/reward.model.js';
import { Submission } from './submission.model.js';
import {
  automationConfigured,
  isValidWorkflowSecret,
  sendSubmissionToN8n,
} from '../../integrations/n8n.client.js';
import { readExpiryDate } from '../../integrations/expiry-ocr.client.js';
import { decideSubmission } from './review.service.js';

export const listMine = async (req, res) => {
  const { page, limit, skip, status } = pagination(req.query);
  const filter = { userId: req.user._id, ...(status ? { status } : {}) };
  const [submissions, total, totals] = await Promise.all([
    Submission.find(filter)
      .select('-imagePath -imageHash')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Submission.countDocuments(filter),
    Reward.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]),
  ]);
  res.json({
    submissions,
    points: totals[0]?.total || 0,
    limits: { maxUploadMb: env.MAX_UPLOAD_MB },
    pagination: pageMeta(page, limit, total),
  });
};

export const uploadPhoto = async (req, res) => {
  if (!req.file)
    return res
      .status(422)
      .json({ error: 'Upload a JPG, PNG, or WEBP product photo.' });
  const bytes = await fs.promises.readFile(req.file.path);
  let validImage = false;
  try {
    const metadata = await sharp(bytes, {
      limitInputPixels: 40_000_000,
    }).metadata();
    const formats = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    validImage =
      metadata.format === formats[req.file.mimetype] && !metadata.pages;
    // Fully decode the pixels to reject truncated files, not just forged MIME headers.
    if (validImage)
      await sharp(bytes, { limitInputPixels: 40_000_000 }).stats();
  } catch {
    validImage = false;
  }
  if (!validImage) {
    await fs.promises.unlink(req.file.path);
    return res.status(422).json({
      error:
        'Choose a valid, non-animated JPG, PNG, or WEBP image under 40 megapixels.',
    });
  }
  const imageHash = crypto.createHash('sha256').update(bytes).digest('hex');
  const submissionId = new mongoose.Types.ObjectId();
  const imageUrl = `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/submissions/${submissionId}/image`;
  let submission;
  try {
    submission = await Submission.create({
      _id: submissionId,
      imageHash,
      userId: req.user._id,
      imageUrl,
      imagePath: req.file.filename,
      originalFileName: req.file.originalname.slice(0, 180),
      status: automationConfigured() ? 'processing' : 'pending_review',
    });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    throw error;
  }
  if (automationConfigured()) {
    try {
      const expiryInfo = await readExpiryDate(submission.imagePath);
      const processing = await Submission.findOneAndUpdate(
        { _id: submission._id, status: 'processing' },
        { $set: expiryInfo },
        { new: true },
      );
      if (processing) await sendSubmissionToN8n(processing);
      submission = await Submission.findById(submission._id);
    } catch (error) {
      await Submission.updateOne(
        { _id: submission._id, status: 'processing' },
        {
          $set: {
            status: 'pending_review',
            reviewNote:
              'Automatic checking was unavailable. An administrator will review your photo.',
          },
        },
      );
      submission = await Submission.findById(submission._id);
    }
  }
  return res.status(201).json({
    submission,
    message:
      submission.status === 'processing'
        ? 'Photo uploaded. Checking the expiry date now.'
        : submission.status === 'pending_review'
          ? 'Photo uploaded. It is waiting for admin review.'
          : 'Photo uploaded. Your date check is complete.',
  });
};

export const automationStatus = (_req, res) =>
  res.json({ configured: automationConfigured() });

export const automationResult = async (req, res) => {
  if (!isValidWorkflowSecret(req.get('x-automation-secret')))
    return res.status(401).json({ error: 'Invalid workflow secret.' });
  const parsed = z
    .object({
      submissionId: z.string().regex(/^[a-f\d]{24}$/i),
      expiryDate: z
        .string()
        .refine(
          (value) => Boolean(parseCalendarDate(value)),
          'Invalid calendar date.',
        )
        .nullable(),
      confidence: z.number().min(0).max(1),
      isExpired: z.boolean(),
      note: z.string().max(500).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(422).json({ error: 'The workflow result is invalid.' });
  try {
    if (parsed.data.expiryDate) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const backendExpired = isExpiredDate(
        parseCalendarDate(parsed.data.expiryDate),
        today,
      );
      if (backendExpired !== parsed.data.isExpired)
        return res.status(409).json({
          error:
            'The workflow date comparison did not match the backend date check.',
        });
    }
    const submission = await decideSubmission(parsed.data);
    return res.json({
      success: true,
      status: submission.status,
      userId: String(submission.userId),
      pointsAwarded: submission.pointsAwarded,
    });
  } catch (error) {
    throw error;
  }
};

export const listAdmin = async (req, res) => {
  const { page, limit, skip, status } = pagination(req.query);
  const filter = status ? { status } : {};
  const [submissions, total] = await Promise.all([
    Submission.find(filter)
      .select('-imagePath -imageHash')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Submission.countDocuments(filter),
  ]);
  res.json({ submissions, pagination: pageMeta(page, limit, total) });
};

export const reviewSubmission = async (req, res) => {
  const parsed = z
    .object({
      decision: z.enum(['approve', 'reject']),
      expiryDate: z
        .string()
        .refine(
          (value) => Boolean(parseCalendarDate(value)),
          'Invalid calendar date.',
        )
        .optional(),
      points: z.coerce.number().int().min(1).max(100000).optional(),
      note: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(422).json({
      error:
        'Choose approve or reject and provide a valid expiry date to approve.',
    });
  try {
    if (parsed.data.decision === 'reject') {
      const updated = await Submission.findOneAndUpdate(
        {
          _id: req.params.submissionId,
          status: { $in: ['processing', 'pending_review'] },
        },
        {
          $set: {
            status: 'rejected',
            reviewNote: parsed.data.note || 'Rejected by an administrator.',
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
          },
        },
        { new: true },
      );
      if (!updated)
        return res
          .status(409)
          .json({ error: 'This submission has already been reviewed.' });
      return res.json({ submission: updated });
    }
    if (!parsed.data.expiryDate)
      return res.status(422).json({
        error: 'Enter the expiry date printed on the product before approving.',
      });
    const submission = await decideSubmission({
      submissionId: req.params.submissionId,
      expiryDate: parsed.data.expiryDate,
      confidence: 1,
      note: parsed.data.note || 'Reviewed by an administrator.',
      reviewerId: req.user._id,
      points: parsed.data.points || env.REWARD_POINTS,
    });
    return res.json({ submission });
  } catch (error) {
    throw error;
  }
};

export const listRewards = async (_req, res) => {
  const rewards = await Reward.find()
    .populate('userId', 'fullName email')
    .populate('submissionId', 'originalFileName expiryDate')
    .sort({ createdAt: -1 })
    .limit(250)
    .lean();
  res.json({ rewards });
};

export const viewImage = async (req, res) => {
  const submission = await Submission.findById(req.params.submissionId);
  if (
    !submission ||
    (req.user.role !== 'admin' &&
      String(submission.userId) !== String(req.user._id))
  ) {
    return res.status(404).json({ error: 'Photo not found.' });
  }
  res.setHeader('cache-control', 'private, no-store');
  return res.sendFile(path.basename(submission.imagePath), {
    root: uploadDirectory,
  });
};
export const memberRewards = async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { userId: req.user._id };
  const [rewards, total] = await Promise.all([
    Reward.find(filter)
      .populate('submissionId', 'originalFileName expiryDate')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reward.countDocuments(filter),
  ]);
  res.json({ rewards, pagination: pageMeta(page, limit, total) });
};
