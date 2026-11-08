import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const automationConfigured = () => Boolean(env.N8N_WEBHOOK_URL);

export async function sendSubmissionToN8n(submission) {
  if (!automationConfigured()) return false;
  const body = JSON.stringify({
    submissionId: String(submission._id),
    userId: String(submission.userId),
    imageUrl: submission.imageUrl,
    uploadedAt: submission.createdAt.toISOString(),
    expiryDate: submission.expiryDate?.toISOString().slice(0, 10) || null,
    confidence: submission.expiryConfidence ?? 0,
    note: submission.reviewNote || '',
  });
  const response = await fetch(env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-automation-secret': env.N8N_CALLBACK_SECRET,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`n8n webhook returned ${response.status}`);
  return true;
}

export function isValidWorkflowSecret(secretHeader) {
  const received = Buffer.from(String(secretHeader || ''));
  const expected = Buffer.from(env.N8N_CALLBACK_SECRET);
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}
