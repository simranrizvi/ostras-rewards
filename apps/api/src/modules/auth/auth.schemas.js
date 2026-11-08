import { z } from 'zod';
import { parseCalendarDate } from '../../shared/date.js';
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(10)
    .max(100)
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'Password must be at most 72 UTF-8 bytes.',
    ),
  phone: z.string().trim().max(30).optional().default(''),
  zipCode: z.string().trim().max(20).optional().default(''),
  birthday: z
    .string()
    .refine(
      (value) =>
        !value ||
        (parseCalendarDate(value) &&
          value <= new Date().toISOString().slice(0, 10)),
      'Enter a valid birthday.',
    )
    .optional()
    .default(''),
  gender: z
    .enum(['unspecified', 'female', 'male', 'other'])
    .optional()
    .default('unspecified'),
  referralCode: z.string().trim().max(40).optional().default(''),
});
export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(100),
});
