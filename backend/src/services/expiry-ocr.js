import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const mimeByExtension = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export async function readExpiryDate(imagePath) {
  if (!env.OPENAI_API_KEY) throw new Error('Expiry-date image reading is not configured.');
  const absolute = path.resolve(process.cwd(), env.UPLOAD_DIR, imagePath);
  const image = await fs.readFile(absolute);
  const ext = path.extname(imagePath).toLowerCase();
  const dataUrl = `data:${mimeByExtension[ext] || 'image/jpeg'};base64,${image.toString('base64')}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'Inspect this product photo. Read the printed expiry or best-before date. Return JSON only: {"expiryDate":"YYYY-MM-DD or null","confidence":number from 0 to 1,"note":"short reason if unreadable"}. Do not guess. If multiple dates are visible, choose the expiry/best-before date, not the manufacturing date.' },
        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
      ] }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'Could not read the product image.');
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) throw new Error('Expiry-date reader returned an empty result.');
  const result = JSON.parse(resultText);
  const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(result.expiryDate || '') ? result.expiryDate : null;
  return {
    expiryDate,
    expiryConfidence: Number.isFinite(result.confidence) ? Math.max(0, Math.min(1, result.confidence)) : 0,
    reviewNote: String(result.note || '').slice(0, 500),
  };
}
