import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import multer from 'multer';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import submissionRoutes from './routes/submissions.js';

const app = express();
const uploadFolder = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadFolder, { recursive: true });

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(uploadFolder, { maxAge: '1d', dotfiles: 'deny', fallthrough: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'ostras-rewards-api', requestId: crypto.randomUUID(), timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/submissions', submissionRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Photo must be ${env.MAX_UPLOAD_MB} MB or smaller.` });
  if (error instanceof multer.MulterError) return res.status(422).json({ error: error.message });
  return res.status(error.status || 500).json({ error: error.status ? error.message : 'Something went wrong. Please try again.' });
});

export default app;
