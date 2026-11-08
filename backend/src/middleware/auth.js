import jwt from 'jsonwebtoken';
import { User } from '../modules/users/user.model.js';
import { env } from '../config/env.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies.ostras_session;
  if (!token)
    return res.status(401).json({ error: 'Please sign in to continue.' });
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (
      typeof payload !== 'object' ||
      !/^[a-f\d]{24}$/i.test(payload.sub || '')
    )
      throw new Error('Invalid session subject.');
  } catch {
    return res
      .status(401)
      .json({ error: 'Your session has expired. Please sign in again.' });
  }
  try {
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active')
      return res
        .status(401)
        .json({ error: 'Your session is no longer active.' });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access is required.' });
  return next();
}
