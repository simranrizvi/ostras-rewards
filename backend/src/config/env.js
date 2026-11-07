import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
dotenv.config({ path: path.join(root, '.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4100),
  WEB_ORIGIN: z.string().url().default('http://localhost:3001'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4100'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/ostras_rewards?replicaSet=rs0'),
  JWT_SECRET: z.string().min(32).default('development-secret-change-this-before-deploying'),
  COOKIE_SECURE: z.string().transform((value) => value === 'true').default('false'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(20).default(8),
  REWARD_POINTS: z.coerce.number().int().min(1).max(100000).default(100),
  N8N_WEBHOOK_URL: z.union([z.string().url(), z.literal('')]).default(''),
  N8N_CALLBACK_SECRET: z.string().min(16).default('replace-with-a-long-random-secret'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(12).default('change-this-password'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
});

export const env = schema.parse(process.env);
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'development-secret-change-this-before-deploying') {
  throw new Error('Set a private JWT_SECRET before starting in production.');
}
