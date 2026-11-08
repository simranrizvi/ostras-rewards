import { parseCalendarDate } from '../../shared/date.js';
import mongoose from 'mongoose';
import { Reward } from '../rewards/reward.model.js';
import { Submission } from './submission.model.js';
import { env } from '../../config/env.js';

export async function decideSubmission({
  submissionId,
  expiryDate,
  confidence,
  note = '',
  reviewerId = null,
  points = null,
}) {
  const session = await mongoose.startSession();
  let output;
  try {
    await session.withTransaction(async () => {
      const submission =
        await Submission.findById(submissionId).session(session);
      if (!submission)
        throw Object.assign(new Error('Submission not found.'), {
          status: 404,
        });
      if (['approved', 'rejected', 'expired'].includes(submission.status)) {
        output = submission;
        return;
      }
      const parsedDate = parseCalendarDate(expiryDate);
      if (
        !parsedDate ||
        Number.isNaN(parsedDate.valueOf()) ||
        confidence < 0.78
      ) {
        submission.status = 'pending_review';
        submission.expiryDate =
          parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate : null;
        submission.expiryConfidence = Number.isFinite(confidence)
          ? confidence
          : null;
        submission.reviewNote =
          note ||
          'Expiry date could not be read confidently. Admin review is required.';
        submission.reviewedBy = reviewerId;
        submission.reviewedAt = new Date();
        await submission.save({ session });
        output = submission;
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      submission.expiryDate = parsedDate;
      submission.expiryConfidence = confidence;
      submission.reviewedBy = reviewerId;
      submission.reviewedAt = new Date();
      submission.reviewNote = note;
      if (parsedDate < today) {
        submission.status = 'expired';
        submission.pointsAwarded = 0;
      } else {
        submission.status = 'approved';
        const rewardPoints =
          Number.isInteger(points) && points > 0 ? points : env.REWARD_POINTS;
        submission.pointsAwarded = rewardPoints;
      }
      // Write the shared submission first so competing approvals get a retryable
      // write conflict, then observe the terminal result on transaction retry.
      await submission.save({ session });
      if (submission.status === 'approved') {
        await Reward.create(
          [
            {
              userId: submission.userId,
              submissionId: submission._id,
              points: submission.pointsAwarded,
            },
          ],
          { session },
        );
      }
      output = submission;
    });
    return output;
  } finally {
    await session.endSession();
  }
}
