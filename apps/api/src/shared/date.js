// Calendar dates are validated by round-trip, so February 31 cannot earn points.
export function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}
export function isExpiredDate(date, now = new Date()) {
  return date.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
}
