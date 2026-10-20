import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Clock3, LoaderCircle, Ticket } from 'lucide-react';
import { getCountdown, isActiveOrder } from '../lib/ticketing';

export function Button({ children, variant = 'primary', pending = false, className = '', disabled, ...props }) {
  return <button {...props} disabled={disabled || pending} className={`button button-${variant} ${className}`}>
    {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{children}
  </button>;
}

export function ErrorNotice({ errors }) {
  if (!errors?.length) return null;
  return <div role="alert" className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
    <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <ul className="space-y-1">{errors.map((error, index) => <li key={`${error.field || ''}-${index}`}>{error.message || 'The request could not be completed.'}</li>)}</ul>
  </div>;
}

export function Field({ label, id, error, ...props }) {
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-stone-800">{label}</label>
    <input {...props} id={id} className="field" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    {error && <p id={`${id}-error`} className="text-sm text-red-800">{error}</p>}
  </div>;
}

export function BackLink({ href = '/', children = 'Tickets' }) {
  return <Link href={href} className="mb-7 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-800"><ArrowLeft size={16} aria-hidden="true" />{children}</Link>;
}

export function StatusBadge({ status }) {
  const labels = { available: 'Available', reserved: 'Reserved', created: 'Reserved', 'awaiting:payment': 'Reserved', cancelled: 'Cancelled', complete: 'Complete' };
  const colors = status === 'available' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : ['created', 'reserved', 'awaiting:payment'].includes(status) ? 'bg-amber-50 text-amber-900 border-amber-200'
      : 'bg-stone-100 text-stone-600 border-stone-200';
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium ${colors}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{labels[status] || status}
  </span>;
}

export function Countdown({ order }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    if (!isActiveOrder(order)) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order.expiresAt, order.status]);
  if (!isActiveOrder(order)) return null;
  const elapsed = now !== null && Date.parse(order.expiresAt) <= now;
  return <span className="inline-flex items-center gap-2 text-sm text-stone-600">
    <Clock3 size={16} aria-hidden="true" />
    <time dateTime={order.expiresAt} className="min-w-12 tabular-nums">{now === null ? '--:--' : getCountdown(order.expiresAt, now)}</time>
    {elapsed && <span className="text-xs">Awaiting expiration</span>}
  </span>;
}

export function EmptyState({ title, action }) {
  return <div className="flex flex-col items-center gap-4 py-20 text-center">
    <Ticket size={36} strokeWidth={1.4} className="text-stone-400" aria-hidden="true" />
    <p className="text-base text-stone-600">{title}</p>{action}
  </div>;
}

export function PageProblem({ error, returnTo = '/' }) {
  if (!error) return null;
  const signedOut = error.status === 401;
  const title = signedOut ? 'Sign in to continue' : error.status === 404 ? 'Not found' : error.status === 403 ? 'Not available' : 'Unable to load this page';
  return <section className="mx-auto max-w-lg py-16">
    <h1 className="mb-6 text-3xl font-semibold">{title}</h1>
    {signedOut
      ? <Link className="button button-primary" href={{ pathname: '/auth/signin', query: { returnTo } }}>Sign In</Link>
      : <div className="flex flex-wrap gap-3"><Link href="/" className="button button-secondary">Back to tickets</Link><Button onClick={() => window.location.reload()}>Try again</Button></div>}
  </section>;
}