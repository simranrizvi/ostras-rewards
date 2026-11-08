import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const source =
  "import { env } from './src/config/env.js'; console.log(JSON.stringify({ secure: env.COOKIE_SECURE }));";
function config(values = {}) {
  const childEnv = { ...process.env, NODE_ENV: 'test', ...values };
  delete childEnv.COOKIE_SECURE;
  if (Object.hasOwn(values, 'COOKIE_SECURE'))
    childEnv.COOKIE_SECURE = values.COOKIE_SECURE;
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    env: childEnv,
    encoding: 'utf8',
  });
}
test('cookie security defaults to boolean false and parses true/false strictly', () => {
  assert.match(config().stdout, /"secure":false/);
  assert.match(config({ COOKIE_SECURE: 'true' }).stdout, /"secure":true/);
  assert.match(config({ COOKIE_SECURE: 'false' }).stdout, /"secure":false/);
  assert.notEqual(config({ COOKIE_SECURE: 'nope' }).status, 0);
});
test('production rejects example secrets and insecure cookie configuration', () => {
  assert.notEqual(config({ NODE_ENV: 'production' }).status, 0);
  assert.notEqual(
    config({
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(40),
      N8N_CALLBACK_SECRET: 'x'.repeat(32),
      COOKIE_SECURE: 'false',
    }).status,
    0,
  );
  assert.equal(
    config({
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(40),
      N8N_CALLBACK_SECRET: 'x'.repeat(32),
      COOKIE_SECURE: 'true',
    }).status,
    0,
  );
});
