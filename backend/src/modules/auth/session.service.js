import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
export function setSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie('ostras_session', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
export function clearSession(res) {
  res.clearCookie('ostras_session', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
}
