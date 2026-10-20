const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

const baseURL = process.env.ACCEPTANCE_BASE_URL || 'http://localhost:3000';
const requestTimeout = 15000;
const eventTimeout = 10000;

function createClient() {
  const cookies = new Map();

  return async (pathname, { method = 'GET', body } = {}) => {
    const response = await fetch(new URL(pathname, baseURL), {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(requestTimeout),
      redirect: 'manual',
    });

    for (const header of response.headers.getSetCookie()) {
      const cookie = header.split(';')[0];
      const separator = cookie.indexOf('=');
      cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
    }

    const text = await response.text();
    const data = response.headers.get('content-type')?.includes('application/json')
      && text ? JSON.parse(text) : text;
    return { status: response.status, data };
  };
}

function expectStatus(response, expected) {
  assert.equal(response.status, expected, JSON.stringify(response.data));
  return response.data;
}

async function signUp(client) {
  const credentials = {
    email: `acceptance-${randomUUID()}@example.com`,
    password: 'acceptance-test-123',
  };
  const user = expectStatus(await client('/api/users/signup', {
    method: 'POST',
    body: credentials,
  }), 201);
  assert.ok(user.id);
  assert.equal(user.email, credentials.email);
  assert.equal(user.password, undefined);
  return { user, credentials };
}

async function eventually(check, timeout = eventTimeout) {
  const deadline = Date.now() + timeout;
  let lastError;

  do {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  } while (Date.now() < deadline);

  throw lastError;
}

describe('Ticketing acceptance through the frontend API proxy', {
  concurrent: false,
}, () => {
  beforeAll(async () => {
    const client = createClient();
    await eventually(async () => {
      expectStatus(await client('/api/tickets'), 200);
    }, 60000);
  });

  it('renders the ticket catalogue, signup, and signin pages', async () => {
    const client = createClient();
    for (const [pathname, expectedText] of [
      ['/', 'Tickets'],
      ['/auth/signup', 'Sign Up'],
      ['/auth/signin', 'Sign In'],
    ]) {
      const html = expectStatus(await client(pathname), 200);
      assert.equal(typeof html, 'string');
      assert.ok(html.includes(expectedText), `${pathname} did not render ${expectedText}`);
      assert.ok(!html.includes('Internal Server Error'), pathname);
      if (pathname === '/') {
        assert.match(html, /<h1\b[^>]*>Tickets<\/h1>/);
        assert.ok(html.includes('id="ticket-search"'), 'The ticket catalogue search was not rendered');
      }
    }
  });

  it('rejects unauthenticated current-user, ticket creation, and order access', async () => {
    const client = createClient();
    for (const [pathname, options] of [
      ['/api/users/currentuser', {}],
      ['/api/tickets', { method: 'POST', body: { title: 'Unauthorized', price: 10 } }],
      ['/api/orders', {}],
    ]) {
      const data = expectStatus(await client(pathname, options), 401);
      assert.ok(Array.isArray(data.errors));
    }
  });

  it('returns field-level validation errors for invalid signup input', async () => {
    const client = createClient();
    const data = expectStatus(await client('/api/users/signup', {
      method: 'POST',
      body: { email: 'invalid', password: 'x' },
    }), 400);
    assert.ok(data.errors.some(error => error.field === 'email'));
    assert.ok(data.errors.some(error => error.field === 'password'));
  });

  it('maintains cookie sessions through signup, signout, and signin', async () => {
    const client = createClient();
    const { user, credentials } = await signUp(client);
    let current = expectStatus(await client('/api/users/currentuser'), 200);
    assert.equal(current.currentUser.id, user.id);
    assert.equal(current.currentUser.email, credentials.email);

    expectStatus(await client('/api/users/signout', { method: 'POST', body: {} }), 200);
    expectStatus(await client('/api/users/currentuser'), 401);
    expectStatus(await client('/api/users/signin', {
      method: 'POST',
      body: { ...credentials, password: 'wrong-password' },
    }), 400);
    expectStatus(await client('/api/users/currentuser'), 401);

    expectStatus(await client('/api/users/signin', { method: 'POST', body: credentials }), 200);
    current = expectStatus(await client('/api/users/currentuser'), 200);
    assert.equal(current.currentUser.id, user.id);
  });

  it('reserves tickets across services, protects ownership, and releases cancelled orders', async () => {
    const owner = createClient();
    const other = createClient();
    const { user } = await signUp(owner);
    await signUp(other);

    const ticket = expectStatus(await owner('/api/tickets', {
      method: 'POST',
      body: { title: `Acceptance ${randomUUID()}`, price: 25 },
    }), 201);
    assert.ok(ticket.id);
    assert.equal(ticket.userId, user.id);
    assert.equal(ticket.price, 25);

    const order = await eventually(async () => {
      const response = await owner('/api/orders', {
        method: 'POST',
        body: { ticketId: ticket.id },
      });
      if (response.status === 404) {
        throw new Error('Waiting for ticket:created replication');
      }
      return expectStatus(response, 201);
    });

    try {
      assert.equal(order.status, 'created');
      assert.equal(order.ticket.id, ticket.id);
      assert.ok(Date.parse(order.expiresAt) > Date.now());

      await eventually(async () => {
        const reserved = expectStatus(await owner(`/api/tickets/${ticket.id}`), 200);
        assert.equal(reserved.orderId, order.id);
      });

      expectStatus(await other(`/api/orders/${order.id}`), 401);
      expectStatus(await other(`/api/orders/${order.id}`, { method: 'DELETE' }), 401);
      expectStatus(await owner('/api/orders', {
        method: 'POST',
        body: { ticketId: ticket.id },
      }), 400);
      expectStatus(await owner(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        body: { title: 'Cannot edit a reserved ticket', price: 30 },
      }), 400);
    } finally {
      expectStatus(await owner(`/api/orders/${order.id}`, { method: 'DELETE' }), 204);
    }

    await eventually(async () => {
      const cancelled = expectStatus(await owner(`/api/orders/${order.id}`), 200);
      assert.equal(cancelled.status, 'cancelled');
      const released = expectStatus(await owner(`/api/tickets/${ticket.id}`), 200);
      assert.ok(!released.orderId);
    });

    expectStatus(await owner(`/api/tickets/${ticket.id}`, {
      method: 'PUT',
      body: { title: 'Released acceptance ticket', price: 30 },
    }), 200);
  });

  it('automatically expires an order and releases its ticket through the expiration worker', {
    timeout: 17 * 60 * 1000,
  }, async () => {
    const owner = createClient();
    await signUp(owner);
    const ticket = expectStatus(await owner('/api/tickets', {
      method: 'POST',
      body: { title: `Expiration ${randomUUID()}`, price: 25 },
    }), 201);

    const order = await eventually(async () => {
      const response = await owner('/api/orders', {
        method: 'POST',
        body: { ticketId: ticket.id },
      });
      if (response.status === 404) {
        throw new Error('Waiting for ticket:created replication');
      }
      return expectStatus(response, 201);
    });
    assert.equal(order.status, 'created');
    const expiresAt = Date.parse(order.expiresAt);
    assert.ok(Number.isFinite(expiresAt) && expiresAt > Date.now());

    const reserved = await eventually(async () => {
      const current = expectStatus(await owner(`/api/tickets/${ticket.id}`), 200);
      assert.equal(current.orderId, order.id);
      return current;
    });

    while (Date.now() < expiresAt) {
      const active = expectStatus(await owner(`/api/orders/${order.id}`), 200);
      if (Date.now() < expiresAt) assert.equal(active.status, 'created');
      await delay(Math.max(1, Math.min(250, expiresAt - Date.now())));
    }

    await eventually(async () => {
      const expired = expectStatus(await owner(`/api/orders/${order.id}`), 200);
      assert.equal(expired.status, 'cancelled');
      const released = expectStatus(await owner(`/api/tickets/${ticket.id}`), 200);
      assert.ok(!released.orderId);
      assert.ok(released.version > reserved.version);
    });

    const nextOrder = expectStatus(await owner('/api/orders', {
      method: 'POST',
      body: { ticketId: ticket.id },
    }), 201);
    try {
      assert.equal(nextOrder.status, 'created');
      assert.notEqual(nextOrder.id, order.id);
      assert.equal(nextOrder.ticket.id, ticket.id);
    } finally {
      expectStatus(await owner(`/api/orders/${nextOrder.id}`, { method: 'DELETE' }), 204);
    }
  });
});