import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import mongoose from 'mongoose';
import { env, uploadDirectory } from '../../config/env.js';

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'productPhotos',
  });
}
export async function persistPhoto(file) {
  if (env.IMAGE_STORAGE === 'disk')
    return { imageStorage: 'disk', imageFileId: null };
  const upload = bucket().openUploadStream(file.filename, {
    metadata: { contentType: file.mimetype },
  });
  try {
    await pipeline(fs.createReadStream(file.path), upload);
    return { imageStorage: 'mongodb', imageFileId: upload.id };
  } catch (error) {
    await upload.abort().catch(() => {});
    throw error;
  }
}
export async function removePersistedPhoto(photo) {
  if (photo?.imageFileId) await bucket().delete(photo.imageFileId);
}
export async function sendPhoto(submission, res, next) {
  if (submission.imageStorage !== 'mongodb' || !submission.imageFileId) {
    return res.sendFile(path.basename(submission.imagePath), {
      root: uploadDirectory,
    });
  }
  const files = bucket();
  const metadata = await files.find({ _id: submission.imageFileId }).next();
  if (!metadata) return res.status(404).json({ error: 'Photo not found.' });
  res.setHeader(
    'content-type',
    metadata.metadata?.contentType || 'application/octet-stream',
  );
  res.setHeader('content-length', String(metadata.length));
  const download = files.openDownloadStream(submission.imageFileId);
  res.on('close', () => download.destroy());
  download.on('error', (error) => {
    if (!res.headersSent) next(error);
    else res.destroy(error);
  });
  download.pipe(res);
}
export async function cleanTemporaryPhoto(file) {
  if (env.IMAGE_STORAGE === 'mongodb')
    await fs.promises.unlink(file.path).catch(() => {});
}
