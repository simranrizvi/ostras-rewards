import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env, uploadDirectory } from '../config/env.js';
const uploadDir = uploadDirectory;
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${allowed.get(file.mimetype) || '.img'}`),
});
export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, allowed.has(file.mimetype)),
});
