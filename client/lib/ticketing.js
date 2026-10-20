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
    return target.origin === 'http://ticketing.local' ? `${target.pathname}${target.search}${target.hash}` : '/';
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

export async function loadPageData(context, pathname, requireUser = false) {
  if (requireUser && context.sessionError) {
    if (context.res) context.res.statusCode = 503;
    return { data: null, error: { status: 503 } };
  }
  if (requireUser && !context.currentUser) {
    return { data: null, error: { status: 401 } };
  }
  try {
    const data = await requestJson(buildClient(context), pathname);
    return { data, error: null };
  } catch (error) {
    const status = error.status || 503;
    if (context.res && status !== 401) context.res.statusCode = status;
    return { data: null, error: { status } };
  }
}