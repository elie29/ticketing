const assert = require('node:assert/strict');

test('only an owner can edit an unreserved ticket', async () => {
  const { canEditTicket } = await import('../src/lib/ticketing.js');
  const ticket = { userId: 'owner' };
  assert.equal(canEditTicket(ticket, { id: 'owner' }), true);
  assert.equal(canEditTicket(ticket, { id: 'other' }), false);
  assert.equal(canEditTicket(ticket, null), false);
  assert.equal(canEditTicket({ ...ticket, orderId: 'order' }, { id: 'owner' }), false);
});

test('countdowns clamp elapsed reservations without inventing cancellation', async () => {
  const { getCountdown } = await import('../src/lib/ticketing.js');
  const expiresAt = '2026-10-20T12:15:00.000Z';
  assert.equal(getCountdown(expiresAt, Date.parse('2026-10-20T12:00:00Z')), '15:00');
  assert.equal(getCountdown(expiresAt, Date.parse('2026-10-20T12:14:01Z')), '00:59');
  assert.equal(getCountdown(expiresAt, Date.parse('2026-10-20T12:16:00Z')), '00:00');
});

test('authentication return paths reject external and malformed destinations', async () => {
  const { getReturnPath } = await import('../src/lib/ticketing.js');
  assert.equal(getReturnPath('/tickets/123?reserve=1'), '/tickets/123?reserve=1');
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', undefined, ['/orders']]) {
    assert.equal(getReturnPath(value), '/');
  }
});

test('authentication return paths reject dot segments that normalize to a protocol-relative URL', async () => {
  const { getReturnPath } = await import('../src/lib/ticketing.js');
  for (const value of ['/a/..//evil.example', '/a/../..//evil.example', '/a/..//evil.example/x?y=1']) {
    assert.equal(getReturnPath(value), '/');
  }
});

test('prices are formatted without assigning an unsupported currency', async () => {
  const { formatPrice } = await import('../src/lib/ticketing.js');
  assert.equal(formatPrice(25), '25.00');
  assert.equal(formatPrice(1234.5), '1,234.50');
});

test('API responses preserve JSON and empty cancellation responses', async () => {
  const { requestJson } = await import('../src/lib/ticketing.js');
  assert.deepEqual(await requestJson(async () => new Response('{"id":"ticket"}', { status: 201 }), '/api/tickets'), { id: 'ticket' });
  assert.equal(await requestJson(async () => new Response(null, { status: 204 }), '/api/orders/1'), null);
});

test('API errors preserve status and backend validation messages', async () => {
  const { requestJson } = await import('../src/lib/ticketing.js');
  const errors = [{ message: 'Title is required', field: 'title' }];
  await assert.rejects(
    requestJson(async () => new Response(JSON.stringify({ errors }), { status: 400 }), '/api/tickets'),
    error => error.status === 400 && JSON.stringify(error.errors) === JSON.stringify(errors)
  );
});

test('an unavailable session service is not treated as a signed-out user', async () => {
  const { loadPageData } = await import('../src/lib/ticketing.js');
  const result = await loadPageData({ currentUser: null, sessionError: true }, '/api/orders', true);
  assert.deepEqual(result, { data: null, error: { status: 503 } });
});

const jsonResponse = (body, status) => async () => new Response(JSON.stringify(body), { status });
const unreachable = async () => { throw new TypeError('fetch failed'); };

test('a 200 session response yields the current user', async () => {
  const { loadSession } = await import('../src/lib/ticketing.js');
  const user = { id: 'u1', email: 'a@b.c' };
  assert.deepEqual(await loadSession(jsonResponse({ currentUser: user }, 200)), { currentUser: user, sessionError: false });
});

test('a 401 session response is a signed-out user, not an error', async () => {
  const { loadSession } = await import('../src/lib/ticketing.js');
  assert.deepEqual(await loadSession(jsonResponse({ errors: [{ message: 'Not authorized' }] }, 401)), { currentUser: null, sessionError: false });
});

test('a 5xx or unreachable session service is a session error', async () => {
  const { loadSession } = await import('../src/lib/ticketing.js');
  assert.deepEqual(await loadSession(jsonResponse({}, 503)), { currentUser: null, sessionError: true });
  assert.deepEqual(await loadSession(unreachable), { currentUser: null, sessionError: true });
});

test('signed-out users get 401 on pages that require a user', async () => {
  const { loadPageData } = await import('../src/lib/ticketing.js');
  const mustNotFetch = async () => { throw new Error('must not fetch'); };
  assert.deepEqual(await loadPageData({ currentUser: null, sessionError: false }, '/api/orders', true, mustNotFetch), { data: null, error: { status: 401 } });
});

test('page data keeps the backend status, and 503 when unreachable', async () => {
  const { loadPageData } = await import('../src/lib/ticketing.js');
  const session = { currentUser: { id: 'u1' }, sessionError: false };
  assert.deepEqual(await loadPageData(session, '/api/tickets/x', false, jsonResponse({ errors: [{ message: 'Not found' }] }, 404)), { data: null, error: { status: 404 } });
  assert.deepEqual(await loadPageData(session, '/api/tickets/x', false, unreachable), { data: null, error: { status: 503 } });
  assert.deepEqual(await loadPageData(session, '/api/tickets/x', false, jsonResponse({ id: 'x' }, 200)), { data: { id: 'x' }, error: null });
});

test('page data loaded for another URL is never shown for the current one', async () => {
  const { pageStateFor } = await import('../src/lib/ticketing.js');
  const loaded = { pathname: '/api/tickets/a', data: { id: 'a' }, error: null, loading: false };
  assert.equal(pageStateFor(loaded, '/api/tickets/a'), loaded);
  assert.deepEqual(pageStateFor(loaded, '/api/tickets/b'), { data: null, error: null, loading: true });
});
