import crypto from 'node:crypto';
import { env } from '../config/env.js';
export function requestContext(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
// CORS alone does not stop cross-site form POSTs using session cookies.
export function requireTrustedOrigin(req, res, next) {
  if (
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
    req.path === '/api/submissions/automation/result'
  )
    return next();
  const origin = req.get('origin');
  if (
    (origin && origin !== env.WEB_ORIGIN) ||
    (!origin && req.get('sec-fetch-site') === 'cross-site')
  ) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }
  return next();
}
export function validateSubmissionId(req, res, next) {
  if (!/^[a-f\d]{24}$/i.test(req.params.submissionId || ''))
    return res.status(422).json({ error: 'Invalid submission ID.' });
  next();
}
