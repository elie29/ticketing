import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Ticket } from 'lucide-react';
import useLiveData from '../../hooks/use-live-data';
import { formatPrice, isActiveOrder, loadPageData } from '../../lib/ticketing';
import { Countdown, EmptyState, ErrorNotice, PageProblem, StatusBadge } from '../../components/ui';

export default function OrdersPage({ initialOrders, error }) {
  const { data: orders, error: refreshError } = useLiveData('/api/orders', initialOrders, !error);
  const [filter, setFilter] = useState('all');
  if (error) return <PageProblem error={error} returnTo="/orders" />;
  const visible = orders.filter(order => filter === 'all' || (filter === 'active' ? isActiveOrder(order) : order.status === 'cancelled'));

  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-medium uppercase text-stone-500">Reservations</p><h1 className="text-3xl font-semibold sm:text-4xl">My Orders</h1></div><Link href="/" className="button button-secondary"><Ticket size={17} aria-hidden="true" />Browse tickets</Link></div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-stone-200 py-4">
      <div role="group" aria-label="Filter orders" className="flex gap-1 rounded-md border border-stone-200 bg-white p-1">{[['all', 'All orders'], ['active', 'Active'], ['cancelled', 'Cancelled']].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded px-3 text-sm ${filter === value ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>{label}</button>)}</div>
      <p className="text-sm text-stone-500" aria-live="polite">{visible.length} {visible.length === 1 ? 'order' : 'orders'}</p>
    </div>
    {refreshError && <div className="mt-5"><ErrorNotice errors={[{ message: 'Order updates are unavailable. Showing the last loaded status.' }]} /></div>}
    {visible.length ? <ul className="mt-5 divide-y divide-stone-200 border-y border-stone-200 bg-white">{visible.map(order => <li key={order.id}><Link href={`/orders/${order.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-6 hover:bg-emerald-50/40 sm:px-6">
      <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-3"><StatusBadge status={order.status} /><Countdown order={order} /></div><h2 className="break-words text-lg font-medium [overflow-wrap:anywhere]">{order.ticket?.title || 'Ticket unavailable'}</h2><p className="mt-2 font-mono text-xs text-stone-400">#{order.id.slice(-8)}</p></div>
      <div className="flex items-center gap-4"><span className="text-lg font-semibold tabular-nums">{formatPrice(order.ticket?.price)}</span><ArrowUpRight size={19} className="hidden text-stone-400 group-hover:text-emerald-700 sm:block" aria-hidden="true" /></div>
    </Link></li>)}</ul> : <EmptyState title={filter === 'all' ? 'No orders yet' : 'No matching orders'} action={<Link href="/" className="button button-secondary">Browse tickets</Link>} />}
  </>;
}

OrdersPage.getInitialProps = async context => {
  const { data, error } = await loadPageData(context, '/api/orders', true);
  return { initialOrders: data || [], error };
};