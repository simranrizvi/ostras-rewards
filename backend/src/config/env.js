import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../',
);
dotenv.config({ path: path.join(root, '.env') });

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  WEB_ORIGIN: z.string().url().default('http://localhost:3001'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4100'),
  MONGODB_URI: z
    .string()
    .min(1)
    .default('mongodb://127.0.0.1:27017/ostras_rewards?replicaSet=rs0'),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('development-secret-change-this-before-deploying'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  UPLOAD_DIR: z.string().default('./uploads'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(20).default(8),
  REWARD_POINTS: z.coerce.number().int().min(1).max(100000).default(100),
  N8N_WEBHOOK_URL: z.union([z.string().url(), z.literal('')]).default(''),
  N8N_CALLBACK_SECRET: z
    .string()
    .min(16)
    .default('replace-with-a-long-random-secret'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(12).default('change-this-password'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
});

export const env = schema.parse(process.env);
if (
  env.NODE_ENV === 'production' &&
  env.JWT_SECRET === 'development-secret-change-this-before-deploying'
) {
  throw new Error('Set a private JWT_SECRET before starting in production.');
}

export const uploadDirectory = path.resolve(root, 'backend', env.UPLOAD_DIR);

if (env.NODE_ENV === 'production') {
  if (!env.COOKIE_SECURE)
    throw new Error('Production requires COOKIE_SECURE=true and HTTPS.');
  if (
    env.N8N_CALLBACK_SECRET.includes('replace-with') ||
    env.N8N_CALLBACK_SECRET === 'replace-with-a-long-random-secret'
  )
    throw new Error('Set a private N8N_CALLBACK_SECRET in production.');
  if (env.JWT_SECRET.includes('replace-with'))
    throw new Error('Replace the example JWT_SECRET in production.');
}
