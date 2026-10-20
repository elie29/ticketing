const assert = require('node:assert/strict');

test('only an owner can edit an unreserved ticket', async () => {
  const { canEditTicket } = await import('../lib/ticketing.js');
  const ticket = { userId: 'owner' };
  assert.equal(canEditTicket(ticket, { id: 'owner' }), true);
  assert.equal(canEditTicket(ticket, { id: 'other' }), false);
  assert.equal(canEditTicket(ticket, null), false);
  assert.equal(canEditTicket({ ...ticket, orderId: 'order' }, { id: 'owner' }), false);
});

test('countdowns clamp elapsed reservations without inventing cancellation', async () => {
  const { getCountdown } = await import('../lib/ticketing.js');
  const expiresAt = '2026-10-20T12:15:00.000Z';
  assert.equal(getCountdown(expiresAt, Date.parse('2026-10-20T12:00:00Z')), '15:00');
  assert.equal(getCountdown(expiresAt, Date.parse('2026-10-20T12:14:01Z')), '00:59');
  assert.equal(getCountdown(expiresAt, Date.parse('2026-10-20T12:16:00Z')), '00:00');
});

test('authentication return paths reject external and malformed destinations', async () => {
  const { getReturnPath } = await import('../lib/ticketing.js');
  assert.equal(getReturnPath('/tickets/123?reserve=1'), '/tickets/123?reserve=1');
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', undefined, ['/orders']]) {
    assert.equal(getReturnPath(value), '/');
  }
});

test('prices are formatted without assigning an unsupported currency', async () => {
  const { formatPrice } = await import('../lib/ticketing.js');
  assert.equal(formatPrice(25), '25.00');
  assert.equal(formatPrice(1234.5), '1,234.50');
});

test('API responses preserve JSON and empty cancellation responses', async () => {
  const { requestJson } = await import('../lib/ticketing.js');
  assert.deepEqual(await requestJson(async () => new Response('{"id":"ticket"}', { status: 201 }), '/api/tickets'), { id: 'ticket' });
  assert.equal(await requestJson(async () => new Response(null, { status: 204 }), '/api/orders/1'), null);
});

test('API errors preserve status and backend validation messages', async () => {
  const { requestJson } = await import('../lib/ticketing.js');
  const errors = [{ message: 'Title is required', field: 'title' }];
  await assert.rejects(
    requestJson(async () => new Response(JSON.stringify({ errors }), { status: 400 }), '/api/tickets'),
    error => error.status === 400 && JSON.stringify(error.errors) === JSON.stringify(errors)
  );
});

test('an unavailable session service is not treated as a signed-out user', async () => {
  const { loadPageData } = await import('../lib/ticketing.js');
  const result = await loadPageData({ currentUser: null, sessionError: true }, '/api/orders', true);
  assert.deepEqual(result, { data: null, error: { status: 503 } });
});