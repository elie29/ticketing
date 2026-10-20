const assert = require('node:assert/strict');

async function render(failed) {
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router');
  const { default: ErrorBoundary } = await import('../src/components/error-boundary.jsx');
  const boundary = new ErrorBoundary({ children: createElement('p', null, 'page content') });
  if (failed) boundary.state = ErrorBoundary.getDerivedStateFromError(new Error('render failed'));
  return renderToString(createElement(MemoryRouter, null, boundary.render()));
}

test('a render error is caught and recorded as a failure', async () => {
  const { default: ErrorBoundary } = await import('../src/components/error-boundary.jsx');
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(new Error('x')), { failed: true });
});

test('after a render error the boundary shows the page problem instead of a blank app', async () => {
  const html = await render(true);
  assert.ok(html.includes('Unable to load this page'), html);
  assert.ok(html.includes('Back to tickets'), html);
  assert.ok(!html.includes('page content'));
});

test('without an error the boundary renders its page', async () => {
  assert.ok((await render(false)).includes('page content'));
});
