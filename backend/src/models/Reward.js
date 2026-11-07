import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, unique: true },
  points: { type: Number, required: true, min: 1 },
  reason: { type: String, default: 'Valid, unexpired product submission' },
}, { timestamps: true });

rewardSchema.index({ userId: 1, createdAt: -1 });
export const Reward = mongoose.model('Reward', rewardSchema);
