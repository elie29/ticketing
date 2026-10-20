const assert = require('node:assert/strict');

async function loadClient() {
  const requests = [];
  vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ currentUser: null }), {
      headers: { 'content-type': 'application/json' },
    });
  });
  const { default: buildClient } = await import('../src/api/build-client.js');
  return { buildClient, requests };
}

test('the dev proxy is empty when no backend URL is configured', async () => {
  const { apiProxy } = await import('../api-proxy.js');
  assert.deepEqual(apiProxy({}), {});
});

test('the dev proxy routes each API prefix to its configured backend', async () => {
  const { apiProxy } = await import('../api-proxy.js');
  assert.deepEqual(apiProxy({
    AUTH_API_URL: 'http://127.0.0.1:3001',
    ORDERS_API_URL: 'http://127.0.0.1:3002',
    TICKETS_API_URL: 'http://127.0.0.1:3003',
  }), {
    '/api/users': 'http://127.0.0.1:3001',
    '/api/orders': 'http://127.0.0.1:3002',
    '/api/tickets': 'http://127.0.0.1:3003',
  });
  assert.deepEqual(apiProxy({ AUTH_API_URL: 'http://127.0.0.1:3001', ORDERS_API_URL: '' }), { '/api/users': 'http://127.0.0.1:3001' });
});

test('browser requests stay on the same origin', async () => {
  const { buildClient, requests } = await loadClient();
  await buildClient()('/api/users/signout', { method: 'POST' });
  assert.equal(requests[0].url, '/api/users/signout');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.ok(requests[0].options.signal instanceof AbortSignal);
});

test('request options preserve JSON bodies and merge caller headers', async () => {
  const { buildClient, requests } = await loadClient();
  await buildClient()('/api/tickets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Concert', price: 25 }),
  });
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.body, '{"title":"Concert","price":25}');
  assert.equal(new Headers(requests[0].options.headers).get('content-type'), 'application/json');
});

test('HTTP errors remain readable native fetch responses', async () => {
  const { buildClient } = await loadClient();
  vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(
    JSON.stringify({ errors: [{ message: 'Not authorized' }] }),
    { status: 401, headers: { 'content-type': 'application/json' } }
  ));
  const response = await buildClient()('/api/users/currentuser');
  assert.equal(response.ok, false);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { errors: [{ message: 'Not authorized' }] });
});
