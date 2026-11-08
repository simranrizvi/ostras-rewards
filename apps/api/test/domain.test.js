import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendarDate, isExpiredDate } from '../src/shared/date.js';
import { pagination } from '../src/shared/pagination.js';
import { registerSchema } from '../src/modules/auth/auth.schemas.js';

test('calendar dates reject rollover, malformed, and impossible dates', () => {
  for (const value of [
    '2026-02-29',
    '2026-02-31',
    '2026-13-01',
    'tomorrow',
    null,
    '2026-1-01',
  ])
    assert.equal(parseCalendarDate(value), null);
  assert.equal(
    parseCalendarDate('2024-02-29').toISOString(),
    '2024-02-29T00:00:00.000Z',
  );
});
test('expiry remains valid throughout its UTC calendar day', () => {
  const expiry = parseCalendarDate('2026-11-08');
  assert.equal(isExpiredDate(expiry, new Date('2026-11-08T23:59:59Z')), false);
  assert.equal(isExpiredDate(expiry, new Date('2026-11-09T00:00:00Z')), true);
});
test('pagination bounds reject negative, fractional, oversized and unknown filters', () => {
  for (const query of [
    { page: '-1' },
    { page: '1.5' },
    { limit: '100' },
    { status: 'anything' },
  ])
    assert.throws(() => pagination(query));
  assert.deepEqual(pagination({ page: '3', limit: '10', status: 'approved' }), {
    page: 3,
    limit: 10,
    status: 'approved',
    skip: 20,
  });
});
test('registration validates birthdays and bcrypt byte limits', () => {
  const input = {
    fullName: 'Test Member',
    email: 'test@example.com',
    password: 'strong-test-password',
  };
  assert.equal(registerSchema.safeParse(input).success, true);
  for (const birthday of ['2026-02-31', '2999-01-01'])
    assert.equal(
      registerSchema.safeParse({ ...input, birthday }).success,
      false,
    );
  assert.equal(
    registerSchema.safeParse({ ...input, password: '🟢'.repeat(20) }).success,
    false,
  );
});
