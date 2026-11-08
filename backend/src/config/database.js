import { User } from '../modules/users/user.model.js';
import { Reward } from '../modules/rewards/reward.model.js';
import { Submission } from '../modules/submissions/submission.model.js';
import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  await Promise.all([User.init(), Reward.init(), Submission.init()]);
  console.info('Connected to MongoDB');
}
