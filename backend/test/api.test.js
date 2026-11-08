import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import crypto from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replica,
  server,
  base,
  uploadDir,
  app,
  User,
  Submission,
  Reward,
  member,
  admin,
  other,
  submissionId;
process.env.NODE_ENV = 'test';
process.env.N8N_WEBHOOK_URL = '';
process.env.OPENAI_API_KEY = '';
process.env.N8N_CALLBACK_SECRET = 'integration-workflow-secret-123456';
async function request(
  route,
  { cookie, body, headers = {}, method = 'GET' } = {},
) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body && !(body instanceof FormData)
        ? { 'content-type': 'application/json' }
        : {}),
      ...headers,
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = (response.headers.get('content-type') || '').includes(
    'application/json',
  )
    ? await response.json()
    : null;
  return {
    response,
    data,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
before(
  async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ostras-test-'));
    process.env.UPLOAD_DIR = uploadDir;
    if (!process.env.TEST_MONGODB_URI)
      replica = await MongoMemoryReplSet.create({
        replSet: { count: 1 },
        binary: { version: '7.0.24' },
      });
    const uri = process.env.TEST_MONGODB_URI || replica.getUri('ostras_test');
    const match = uri.match(/^[^:]+:\/\/[^/]+\/([^?]+)/);
    if (process.env.TEST_MONGODB_URI && !match?.[1]?.includes('test'))
      throw new Error('TEST_MONGODB_URI must name a dedicated test database.');
    const uniqueDb = `ostras_test_${crypto.randomUUID().replaceAll('-', '')}`;
    process.env.MONGODB_URI = uri.replace(
      /(\/\/[^/]+\/)[^?]*/,
      `$1${uniqueDb}`,
    );
    ({ default: app } = await import('../src/app.js'));
    ({ User } = await import('../src/modules/users/user.model.js'));
    ({ Submission } =
      await import('../src/modules/submissions/submission.model.js'));
    ({ Reward } = await import('../src/modules/rewards/reward.model.js'));
    const { connectDatabase } = await import('../src/config/database.js');
    await connectDatabase();
    // A unique database prevents test cleanup touching an existing developer database.
    assert.match(mongoose.connection.name, /test/);
    await Promise.all([
      User.deleteMany({}),
      Submission.deleteMany({}),
      Reward.deleteMany({}),
    ]);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
  },
  { timeout: 180000 },
);
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (
    mongoose.connection.readyState === 1 &&
    mongoose.connection.name.startsWith('ostras_test_')
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (replica) await replica.stop();
  if (uploadDir) await fs.rm(uploadDir, { recursive: true, force: true });
});

test('health/readiness, session protection and origin checks', async () => {
  assert.equal((await request('/health')).response.status, 200);
  assert.equal((await request('/ready')).response.status, 200);
  assert.equal((await request('/submissions/mine')).response.status, 401);
  assert.equal(
    (
      await request('/auth/logout', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      })
    ).response.status,
    403,
  );
});
test('registration never exposes password hashes; duplicate email rejected', async () => {
  const payload = {
    fullName: 'Test Member',
    email: 'MEMBER@example.com',
    password: 'strong-test-password',
  };
  const result = await request('/auth/register', {
    method: 'POST',
    body: payload,
  });
  assert.equal(result.response.status, 201);
  member = result.cookie;
  assert.equal(result.data.user.passwordHash, undefined);
  assert.match(result.response.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal(
    (await request('/auth/register', { method: 'POST', body: payload }))
      .response.status,
    409,
  );
  const otherResult = await request('/auth/register', {
    method: 'POST',
    body: { ...payload, email: 'other@example.com' },
  });
  other = otherResult.cookie;
  const adminResult = await request('/auth/register', {
    method: 'POST',
    body: { ...payload, email: 'admin-test@example.com' },
  });
  await User.updateOne(
    { _id: adminResult.data.user._id },
    { $set: { role: 'admin' } },
  );
  admin = adminResult.cookie;
  assert.equal(
    (await request('/dashboard/admin', { cookie: member })).response.status,
    403,
  );
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { email: payload.email, password: 'wrong' },
      })
    ).response.status,
    401,
  );
});
async function upload(cookie, color = 'green', invalid = false) {
  const bytes = invalid
    ? Buffer.from('not an image')
    : await sharp({
        create: { width: 8, height: 8, channels: 3, background: color },
      })
        .png()
        .toBuffer();
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'product.png');
  return request('/submissions/upload', { method: 'POST', cookie, body: form });
}
test('valid photos persist; spoofed images and duplicate submissions are rejected', async () => {
  assert.equal((await upload(member, 'green', true)).response.status, 422);
  const result = await upload(member);
  assert.equal(result.response.status, 201);
  submissionId = result.data.submission._id;
  assert.equal(result.data.submission.status, 'pending_review');
  assert.equal((await upload(member)).response.status, 409);
  assert.equal((await fs.readdir(uploadDir)).length, 1);
});
test('only the owner or admin can retrieve private product images', async () => {
  assert.equal(
    (await request(`/submissions/${submissionId}/image`)).response.status,
    401,
  );
  assert.equal(
    (await request(`/submissions/${submissionId}/image`, { cookie: other }))
      .response.status,
    404,
  );
  const image = await request(`/submissions/${submissionId}/image`, {
    cookie: member,
  });
  assert.equal(image.response.status, 200);
  assert.match(
    image.response.headers.get('cache-control'),
    /private.*no-store/,
  );
  assert.equal(
    (await request(`/submissions/${submissionId}/image`, { cookie: admin }))
      .response.status,
    200,
  );
});
test('workflow validates secrets, IDs and impossible dates', async () => {
  const route = '/submissions/automation/result';
  const body = {
    submissionId,
    expiryDate: '2026-02-31',
    confidence: 1,
    isExpired: false,
  };
  assert.equal(
    (await request(route, { method: 'POST', body })).response.status,
    401,
  );
  assert.equal(
    (
      await request(route, {
        method: 'POST',
        body,
        headers: { 'x-automation-secret': process.env.N8N_CALLBACK_SECRET },
      })
    ).response.status,
    422,
  );
  assert.equal(
    (
      await request('/submissions/admin/not-an-id/review', {
        method: 'PATCH',
        cookie: admin,
        body: { decision: 'reject' },
      })
    ).response.status,
    422,
  );
});
test('concurrent approvals award once, to the uploader, and survive callback retries', async () => {
  const body = {
    decision: 'approve',
    expiryDate: '2099-12-31',
    points: 150,
    note: 'Checked by admin',
  };
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      request(`/submissions/admin/${submissionId}/review`, {
        method: 'PATCH',
        cookie: admin,
        body,
      }),
    ),
  );
  for (const result of results) assert.equal(result.response.status, 200);
  assert.equal(await Reward.countDocuments({ submissionId }), 1);
  const reward = await Reward.findOne({ submissionId });
  const owner = (await request('/auth/me', { cookie: member })).data.user._id;
  assert.equal(String(reward.userId), owner);
  assert.equal(reward.points, 150);
  const callback = await request('/submissions/automation/result', {
    method: 'POST',
    headers: { 'x-automation-secret': process.env.N8N_CALLBACK_SECRET },
    body: {
      submissionId,
      expiryDate: '2099-12-31',
      confidence: 1,
      isExpired: false,
      userId: (await User.findOne({ email: 'other@example.com' }))._id,
    },
  });
  assert.equal(callback.response.status, 200);
  assert.equal(await Reward.countDocuments({ submissionId }), 1);
  assert.equal(
    (await request('/dashboard/me', { cookie: member })).data.points,
    150,
  );
});
test('low-confidence and expired photos never earn points; rejection needs no date', async () => {
  const photo = (await upload(member, 'red')).data.submission;
  const route = '/submissions/automation/result';
  const headers = { 'x-automation-secret': process.env.N8N_CALLBACK_SECRET };
  let result = await request(route, {
    method: 'POST',
    headers,
    body: {
      submissionId: photo._id,
      expiryDate: null,
      confidence: 0.2,
      isExpired: false,
    },
  });
  assert.equal(result.data.status, 'pending_review');
  result = await request(route, {
    method: 'POST',
    headers,
    body: {
      submissionId: photo._id,
      expiryDate: '2000-01-01',
      confidence: 1,
      isExpired: true,
    },
  });
  assert.equal(result.data.status, 'expired');
  assert.equal(await Reward.countDocuments({ submissionId: photo._id }), 0);
  const rejectPhoto = (await upload(member, 'blue')).data.submission;
  result = await request(`/submissions/admin/${rejectPhoto._id}/review`, {
    method: 'PATCH',
    cookie: admin,
    body: { decision: 'reject', note: 'Unreadable label' },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.submission.status, 'rejected');
});
test('history filters and pagination include metadata and isolate member records', async () => {
  const result = await request(
    '/submissions/mine?page=1&limit=1&status=approved',
    { cookie: member },
  );
  assert.equal(result.data.submissions.length, 1);
  assert.equal(result.data.pagination.total, 1);
  assert.equal(
    (await request('/submissions/mine?limit=500', { cookie: member })).response
      .status,
    422,
  );
  assert.equal(
    (await request('/submissions/mine', { cookie: other })).data.pagination
      .total,
    0,
  );
  const ledger = await request('/submissions/rewards/mine', { cookie: member });
  assert.equal(ledger.data.rewards[0].points, 150);
  const queue = await request('/submissions/admin/all?status=pending_review', {
    cookie: admin,
  });
  assert.equal(queue.response.status, 200);
});
test('logout clears the session cookie', async () => {
  const result = await request('/auth/logout', {
    method: 'POST',
    cookie: member,
  });
  assert.equal(result.response.status, 204);
  assert.match(
    result.response.headers.get('set-cookie'),
    /Expires=Thu, 01 Jan 1970/i,
  );
});
