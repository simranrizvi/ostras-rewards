import bcrypt from 'bcryptjs';
import { connectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

await connectDatabase();
const email = env.ADMIN_EMAIL.toLowerCase();
const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
await User.findOneAndUpdate(
  { email },
  { $set: { fullName: 'Ostras Admin', email, passwordHash, role: 'admin', status: 'active' } },
  { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
);
console.info(`Admin account ready for ${email}`);
process.exit(0);
