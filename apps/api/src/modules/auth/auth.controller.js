import { registerSchema, loginSchema } from './auth.schemas.js';
import { setSession, clearSession } from './session.service.js';
import bcrypt from 'bcryptjs';
import { User } from '../users/user.model.js';

export const register = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(422).json({
      error: parsed.error.issues[0]?.message || 'Check your details.',
    });
  const { fullName, email, password, birthday, ...profile } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      birthday: birthday ? new Date(birthday) : null,
      ...profile,
    });
    setSession(res, user);
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
    throw error;
  }
};

export const login = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(422).json({ error: 'Enter a valid email and password.' });
  const user = await User.findOne({
    email: parsed.data.email.toLowerCase(),
  }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash)))
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  if (user.status !== 'active')
    return res
      .status(403)
      .json({ error: 'This account is currently suspended.' });
  setSession(res, user);
  return res.json({ user });
};

export const me = (req, res) => res.json({ user: req.user });

export const logout = (_req, res) => {
  clearSession(res);
  res.status(204).end();
};
