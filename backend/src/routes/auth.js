import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();
const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(100),
  phone: z.string().trim().max(30).optional().default(''),
  zipCode: z.string().trim().max(20).optional().default(''),
  birthday: z.string().optional().default(''),
  gender: z.enum(['unspecified', 'female', 'male', 'other']).optional().default('unspecified'),
  referralCode: z.string().trim().max(40).optional().default(''),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(100) });

function setSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('ostras_session', token, {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0]?.message || 'Check your details.' });
  const { fullName, email, password, birthday, ...profile } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email: email.toLowerCase(), passwordHash, birthday: birthday ? new Date(birthday) : null, ...profile });
    setSession(res, user);
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: 'Enter a valid email and password.' });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
  if (!user || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  if (user.status !== 'active') return res.status(403).json({ error: 'This account is currently suspended.' });
  setSession(res, user);
  return res.json({ user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
router.post('/logout', (_req, res) => {
  res.clearCookie('ostras_session', { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/' });
  res.status(204).end();
});

export default router;
