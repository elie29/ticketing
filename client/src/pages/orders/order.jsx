import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ArrowUpRight, Clock3, X } from 'lucide-react';
import useLiveData from '../../hooks/use-live-data';
import useRequest from '../../hooks/use-request';
import { formatPrice, isActiveOrder } from '../../lib/ticketing';
import { BackLink, Button, Countdown, ErrorNotice, Loading, PageProblem, StatusBadge } from '../../components/ui';
import usePageData from '../../hooks/use-page-data';

export default function OrderPage() {
  const { orderId } = useParams();
  const { data, error, loading } = usePageData(`/api/orders/${encodeURIComponent(orderId)}`, { requireUser: true });
  if (loading) return <Loading />;
  return <OrderView initialOrder={data} error={error} />;
}

function OrderView({ initialOrder, error }) {
  const location = useLocation();
  const [confirm, setConfirm] = useState(false);
  const { data: order, setData, error: refreshError } = useLiveData(`/api/orders/${initialOrder?.id || ''}`, initialOrder, !error);
  const { doRequest, errors, pending } = useRequest({
    url: `/api/orders/${order?.id || ''}`, method: 'delete',
    onSuccess: () => { setData(current => ({ ...current, status: 'cancelled' })); setConfirm(false); },
  });
  if (error) return <PageProblem error={error} returnTo={location.pathname + location.search} />;
  const active = isActiveOrder(order);

  return <>
    <BackLink href="/orders">My Orders</BackLink>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold">Order details</h1><StatusBadge status={order.status} /></div>
    <section className="grid gap-8 border-y border-stone-200 bg-white px-6 py-8 sm:px-10 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0"><p className="mb-3 text-xs font-medium uppercase text-stone-500">Ticket</p><h2 className="break-words text-2xl font-semibold [overflow-wrap:anywhere]">{order.ticket?.title || 'Ticket unavailable'}</h2>{order.ticket?.id && <Link to={`/tickets/${order.ticket.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-800">View ticket<ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>
      <div className="md:border-l md:border-stone-200 md:pl-8"><p className="mb-1 text-sm text-stone-500">Price</p><p className="text-3xl font-semibold tabular-nums">{formatPrice(order.ticket?.price)}</p>{active && <div className="mt-5"><p className="mb-2 text-sm text-stone-500">Reservation remaining</p><Countdown order={order} /></div>}</div>
    </section>
    <dl className="grid gap-6 border-b border-stone-200 py-7 sm:grid-cols-2"><div><dt className="mb-2 text-xs font-medium uppercase text-stone-500">Order ID</dt><dd className="break-all font-mono text-sm">{order.id}</dd></div><div><dt className="mb-2 text-xs font-medium uppercase text-stone-500">Expiration</dt><dd className="flex items-start gap-2 text-sm"><Clock3 size={16} className="mt-0.5 shrink-0 text-stone-400" aria-hidden="true" /><time dateTime={order.expiresAt}>{new Date(order.expiresAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}</time></dd></div></dl>
    {refreshError && <div className="mt-5"><ErrorNotice errors={[{ message: 'Status could not be refreshed. The last confirmed order status is shown.' }]} /></div>}
    <div className="mt-6 space-y-4">
      {errors}
      {active && (confirm ? (
        <div role="group" aria-label="Confirm cancellation" className="space-y-4 border-l-2 border-red-400 bg-red-50 px-5 py-4">
          <h2 className="font-medium text-red-950">Cancel this reservation?</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" pending={pending} onClick={doRequest}>Confirm cancellation</Button>
            <Button variant="secondary" disabled={pending} onClick={() => setConfirm(false)}>Keep reservation</Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" onClick={() => setConfirm(true)}><X size={16} aria-hidden="true" />Cancel order</Button>
      ))}
      {order.status === 'cancelled' && <p className="text-sm text-stone-600">This order is cancelled.</p>}
    </div>
  </>;
}
