export default function buildClient({ req } = {}) {
  const server = typeof window === 'undefined';
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

  return (pathname, options = {}) => {
    const headers = new Headers(server ? req?.headers : undefined);
    new Headers(options.headers).forEach((value, name) => headers.set(name, value));

    return fetch(server ? new URL(pathname, baseURL) : pathname, {
      ...options,
      headers,
      credentials: 'same-origin',
      signal: options.signal || AbortSignal.timeout(15000),
    });
  };
}
