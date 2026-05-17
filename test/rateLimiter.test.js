const assert = require('node:assert/strict');
const http = require('node:http');
const { test, beforeEach } = require('node:test');
const createApp = require('../app');
const MemoryStore = require('../config/store/memoryStore');

let server;
let baseUrl;

async function startServer() {
  const store = new MemoryStore();
  const app = createApp({ store });
  server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopServer() {
  if (!server || !server.listening) {
    server = undefined;
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();

  return {
    status: response.status,
    body,
  };
}

beforeEach(async () => {
  await stopServer();
  await startServer();
});

test('free AI endpoint allows five requests and rejects the sixth', async (t) => {
  t.after(stopServer);

  const headers = { 'X-User-Id': 'free-ai-user', 'X-User-Tier': 'free' };

  for (let i = 0; i < 5; i += 1) {
    const response = await request('/ai/generate', { method: 'POST', headers });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
  }

  const blocked = await request('/ai/generate', { method: 'POST', headers });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'rate_limit_exceeded');
  assert.equal(blocked.body.limit, 5);
  assert.equal(blocked.body.window_seconds, 60);
  assert.equal(blocked.body.retry_after_seconds >= 0, true);
});

test('free read endpoint allows thirty requests and rejects the thirty-first', async (t) => {
  t.after(stopServer);

  const headers = { 'X-User-Id': 'free-read-user', 'X-User-Tier': 'free' };

  for (let i = 0; i < 30; i += 1) {
    const response = await request('/data/list', { headers });
    assert.equal(response.status, 200);
  }

  const blocked = await request('/data/list', { headers });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.limit, 30);
});

test('paid AI endpoint uses the paid AI limit', async (t) => {
  t.after(stopServer);

  const headers = { 'X-User-Id': 'paid-ai-user', 'X-User-Tier': 'paid' };

  for (let i = 0; i < 30; i += 1) {
    const response = await request('/ai/summarise', { method: 'POST', headers });
    assert.equal(response.status, 200);
  }

  const blocked = await request('/ai/summarise', { method: 'POST', headers });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.limit, 30);
});

test('paid read endpoint uses the paid read limit', async (t) => {
  t.after(stopServer);

  const headers = { 'X-User-Id': 'paid-read-user', 'X-User-Tier': 'paid' };

  for (let i = 0; i < 120; i += 1) {
    const response = await request('/data/export', { headers });
    assert.equal(response.status, 200);
  }

  const blocked = await request('/data/export', { headers });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.limit, 120);
});

test('missing or invalid tier defaults to free tier', async (t) => {
  t.after(stopServer);

  const headers = { 'X-User-Id': 'default-free-user', 'X-User-Tier': 'enterprise' };

  for (let i = 0; i < 5; i += 1) {
    const response = await request('/ai/generate', { method: 'POST', headers });
    assert.equal(response.status, 200);
  }

  const blocked = await request('/ai/generate', { method: 'POST', headers });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.limit, 5);
});

test('endpoint type is counted separately from user and tier', async (t) => {
  t.after(stopServer);

  const headers = { 'X-User-Id': 'same-user', 'X-User-Tier': 'free' };

  for (let i = 0; i < 5; i += 1) {
    const response = await request('/ai/generate', { method: 'POST', headers });
    assert.equal(response.status, 200);
  }

  const readResponse = await request('/data/list', { headers });
  assert.equal(readResponse.status, 200);
  assert.deepEqual(readResponse.body, { ok: true });
});
