const assert = require('node:assert/strict');

test('a signed-out visitor on an available ticket gets a sign-in link that returns to the ticket', async () => {
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router');
  const { TicketView } = await import('../src/pages/tickets/ticket.jsx');
  const ticket = { id: 't1', title: 'Concert', price: 25, userId: 'owner' };
  const html = renderToString(createElement(MemoryRouter, { initialEntries: ['/tickets/t1?from=list'] },
    createElement(TicketView, { initialTicket: ticket, error: null, currentUser: null })));
  assert.ok(html.includes('href="/auth/signin?returnTo=%2Ftickets%2Ft1%3Ffrom%3Dlist"'), html);
});
