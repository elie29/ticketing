import buildClient from '../api/build-client.js';

export function canEditTicket(ticket, user) {
  return Boolean(user && ticket && ticket.userId === user.id && !ticket.orderId);
}

export function isActiveOrder(order) {
  return order?.status === 'created' || order?.status === 'awaiting:payment';
}

export function getCountdown(expiresAt, now) {
  const milliseconds = Date.parse(expiresAt) - now;
  const seconds = Number.isFinite(milliseconds) ? Math.max(0, Math.ceil(milliseconds / 1000)) : 0;
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function getReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  try {
    const target = new URL(value, 'http://ticketing.local');
    if (target.origin !== 'http://ticketing.local') return '/';
    // Dot segments can normalize to a leading '//' or '/\', which browsers read as protocol-relative.
    if (target.pathname.startsWith('//') || target.pathname.startsWith('/\\')) return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

export function formatPrice(price) {
  return typeof price === 'number' && Number.isFinite(price)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)
    : '--';
}

export async function requestJson(client, pathname, options = {}) {
  const response = await client(pathname, { cache: 'no-store', ...options });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('The request could not be completed.');
    error.status = response.status;
    error.errors = Array.isArray(data?.errors) ? data.errors : [{ message: error.message }];
    throw error;
  }
  return data;
}

export async function loadSession(client) {
  try {
    const response = await client('/api/users/currentuser', { signal: AbortSignal.timeout(5000) });
    if (response.status === 401) return { currentUser: null, sessionError: false };
    if (!response.ok) throw new Error('Current user request failed');
    return { currentUser: (await response.json()).currentUser, sessionError: false };
  } catch {
    return { currentUser: null, sessionError: true };
  }
}

// A result belongs to the URL it was loaded for; any other URL is still loading.
export function pageStateFor(state, pathname) {
  return state.pathname === pathname ? state : { data: null, error: null, loading: true };
}

export async function loadPageData(session, pathname, requireUser = false, client = buildClient()) {
  if (requireUser && session.sessionError) return { data: null, error: { status: 503 } };
  if (requireUser && !session.currentUser) return { data: null, error: { status: 401 } };
  try {
    const data = await requestJson(client, pathname);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { status: error.status || 503 } };
  }
}