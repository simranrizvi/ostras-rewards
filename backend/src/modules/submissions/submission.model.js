import mongoose from 'mongoose';
import { env } from '../../config/env.js';

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    imageUrl: { type: String, required: true },
    imageHash: { type: String },
    imagePath: { type: String, required: true },
    originalFileName: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'processing',
        'pending_review',
        'approved',
        'rejected',
        'expired',
        'failed',
      ],
      default: 'pending_review',
      index: true,
    },
    expiryDate: { type: Date, default: null },
    expiryConfidence: { type: Number, min: 0, max: 1, default: null },
    reviewNote: { type: String, default: '', maxlength: 500 },
    pointsAwarded: { type: Number, default: 0, min: 0 },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index(
  { userId: 1, imageHash: 1 },
  { unique: true, partialFilterExpression: { imageHash: { $type: 'string' } } },
);
submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.post(/^find/, function (result) {
  for (const item of Array.isArray(result) ? result : [result]) {
    if (item?._id && (item.imageUrl || item.imagePath))
      item.imageUrl = `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/submissions/${item._id}/image`;
  }
});
export const Submission = mongoose.model('Submission', submissionSchema);
