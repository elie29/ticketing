// Dev-server proxy table: each API prefix goes to its backend when that backend's URL is set.
const targets = {
  '/api/users': 'AUTH_API_URL',
  '/api/orders': 'ORDERS_API_URL',
  '/api/tickets': 'TICKETS_API_URL',
};

export function apiProxy(env) {
  return Object.fromEntries(Object.entries(targets)
    .filter(([, name]) => env[name])
    .map(([prefix, name]) => [prefix, env[name]]));
}
