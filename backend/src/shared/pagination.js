import { z } from 'zod';
export const statuses = [
  'processing',
  'pending_review',
  'approved',
  'rejected',
  'expired',
  'failed',
];
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(statuses).optional(),
});
export function pagination(query) {
  const result = querySchema.safeParse(query);
  if (!result.success)
    throw Object.assign(new Error('Invalid page, limit, or status filter.'), {
      status: 422,
    });
  return { ...result.data, skip: (result.data.page - 1) * result.data.limit };
}
export const pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});
