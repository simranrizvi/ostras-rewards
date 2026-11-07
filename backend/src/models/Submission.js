import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  imageUrl: { type: String, required: true },
  imagePath: { type: String, required: true },
  originalFileName: { type: String, required: true },
  status: { type: String, enum: ['processing', 'pending_review', 'approved', 'rejected', 'expired', 'failed'], default: 'pending_review', index: true },
  expiryDate: { type: Date, default: null },
  expiryConfidence: { type: Number, min: 0, max: 1, default: null },
  reviewNote: { type: String, default: '', maxlength: 500 },
  pointsAwarded: { type: Number, default: 0, min: 0 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

submissionSchema.index({ userId: 1, createdAt: -1 });
export const Submission = mongoose.model('Submission', submissionSchema);
