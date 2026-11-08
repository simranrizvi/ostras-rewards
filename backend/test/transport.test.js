import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
const { default: app } = await import('../src/app.js');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
});
test('liveness is available without database; readiness is unavailable', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('x-request-id'));
  assert.equal((await fetch(`${base}/api/ready`)).status, 503);
});
test('unauthenticated data and image requests are rejected before database access', async () => {
  for (const route of [
    '/api/submissions/mine',
    '/api/dashboard/admin',
    '/api/submissions/507f1f77bcf86cd799439011/image',
  ])
    assert.equal((await fetch(base + route)).status, 401);
});
test('untrusted mutation origin, missing callback secret and invalid registration fail at boundary', async () => {
  const headers = { 'content-type': 'application/json' };
  assert.equal(
    (
      await fetch(`${base}/api/auth/logout`, {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/submissions/automation/result`, {
        method: 'POST',
        headers,
        body: '{}',
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: 'invalid' }),
      })
    ).status,
    422,
  );
  assert.equal(
    (await fetch(`${base}/uploads/no-public-photo.png`)).status,
    404,
  );
});
