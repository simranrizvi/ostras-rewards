import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import submissionRoutes from './modules/submissions/submissions.routes.js';
import { requestContext, requireTrustedOrigin } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(requestContext);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(requireTrustedOrigin);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (env.NODE_ENV !== 'test')
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    service: 'ostras-rewards-api',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  }),
);
app.get('/api/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? 'ready' : 'unavailable' });
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/submissions', submissionRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);
export default app;
