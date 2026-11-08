import multer from 'multer';
import { env } from '../config/env.js';
export function errorHandler(error, req, res, _next) {
  const requestId = req.requestId;
  if (error.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({
      error: `Photo must be ${env.MAX_UPLOAD_MB} MB or smaller.`,
      requestId,
    });
  if (error instanceof multer.MulterError)
    return res.status(422).json({ error: error.message, requestId });
  if (error.code === 11000)
    return res.status(409).json({
      error: 'This photo has already been submitted by your account.',
      requestId,
    });
  if (error.name === 'CastError' || error.name === 'ValidationError')
    return res.status(422).json({ error: 'Invalid request data.', requestId });
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500)
    console.error({ requestId, message: error.message, stack: error.stack });
  return res.status(status).json({
    error:
      status === 500
        ? 'Something went wrong. Please try again.'
        : error.message,
    requestId,
  });
}
