const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadConfig(environment = {}) {
  const context = {
    module: { exports: {} },
    process: { env: environment },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../next.config.js'), 'utf8'),
    context
  );
  return context.module.exports;
}

async function loadClient(context, environment = {}, browser = false) {
  const originalURL = process.env.API_BASE_URL;
  if (environment.API_BASE_URL) process.env.API_BASE_URL = environment.API_BASE_URL;
  else delete process.env.API_BASE_URL;
  context.onTestFinished(() => {
    if (originalURL === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalURL;
  });
  if (browser) {
    global.window = {};
    context.onTestFinished(() => { delete global.window; });
  }
  const requests = [];
  vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ currentUser: null }), {
      headers: { 'content-type': 'application/json' },
    });
  });
  const { default: buildClient } = await import('../api/build-client.js');
  return { buildClient, requests };
}

test('API rewrites are disabled when no internal services are configured', async () => {
  const config = loadConfig();
  assert.equal(typeof config.rewrites, 'function');
  assert.equal((await config.rewrites()).length, 0);
});

test('API rewrites route each API to its configured internal service', async () => {
  const config = loadConfig({
    AUTH_API_URL: 'http://auth:3001',
    ORDERS_API_URL: 'http://orders:3002',
    TICKETS_API_URL: 'http://tickets:3003',
  });
  assert.equal(typeof config.rewrites, 'function');
  const routes = JSON.parse(JSON.stringify(await config.rewrites()));
  assert.deepEqual(routes, [
    { source: '/api/users/:path*', destination: 'http://auth:3001/api/users/:path*' },
    { source: '/api/orders/:path*', destination: 'http://orders:3002/api/orders/:path*' },
    { source: '/api/tickets/:path*', destination: 'http://tickets:3003/api/tickets/:path*' },
  ]);
});

test('server requests use the configured internal URL and forward cookies', async context => {
  const { buildClient, requests } = await loadClient(context, { API_BASE_URL: 'http://client:3000' });
  const headers = { cookie: 'session=example', host: 'localhost:3000' };
  const client = buildClient({ req: { headers } });
  const response = await client('/api/users/currentuser');
  assert.equal(requests[0].url, 'http://client:3000/api/users/currentuser');
  assert.equal(new Headers(requests[0].options.headers).get('cookie'), 'session=example');
  assert.equal(response.status, 200);
});

test('server requests default to the local frontend outside Compose', async context => {
  const { buildClient, requests } = await loadClient(context);
  const client = buildClient({ req: { headers: {} } });
  await client('/api/users/currentuser');
  assert.equal(requests[0].url, 'http://localhost:3000/api/users/currentuser');
});

test('browser requests stay on the same origin', async context => {
  const { buildClient, requests } = await loadClient(context, { API_BASE_URL: 'http://client:3000' }, true);
  await buildClient()('/api/users/signout', { method: 'POST' });
  assert.equal(requests[0].url, '/api/users/signout');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.credentials, 'same-origin');
});

test('request options preserve JSON bodies and merge headers with server cookies', async context => {
  const { buildClient, requests } = await loadClient(context, { API_BASE_URL: 'http://client:3000' });
  const client = buildClient({ req: { headers: { cookie: 'session=example' } } });
  await client('/api/tickets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Concert', price: 25 }),
  });
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.body, '{"title":"Concert","price":25}');
  const headers = new Headers(requests[0].options.headers);
  assert.equal(headers.get('cookie'), 'session=example');
  assert.equal(headers.get('content-type'), 'application/json');
});

test('HTTP errors remain readable native fetch responses', async context => {
  const { buildClient } = await loadClient(context);
  vi.spyOn(global, 'fetch').mockImplementation(async () => new Response(
    JSON.stringify({ errors: [{ message: 'Not authorized' }] }),
    { status: 401, headers: { 'content-type': 'application/json' } }
  ));
  const response = await buildClient({ req: { headers: {} } })('/api/users/currentuser');
  assert.equal(response.ok, false);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { errors: [{ message: 'Not authorized' }] });
});