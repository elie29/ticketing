export default function buildClient() {
  return (pathname, options = {}) => fetch(pathname, {
    ...options,
    credentials: 'same-origin',
    signal: options.signal || AbortSignal.timeout(15000),
  });
}
