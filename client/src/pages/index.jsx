import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import useLiveData from '../hooks/use-live-data';
import usePageData from '../hooks/use-page-data';
import { formatPrice } from '../lib/ticketing';
import { useSession } from '../session';
import { EmptyState, ErrorNotice, Loading, PageProblem, StatusBadge } from '../components/ui';

export default function TicketsPage() {
  const { currentUser } = useSession();
  const { data, error, loading } = usePageData('/api/tickets');
  if (loading) return <Loading />;
  return <TicketsView initialTickets={data || []} error={error} currentUser={currentUser} />;
}

function TicketsView({ initialTickets, error, currentUser }) {
  const { data: tickets, error: refreshError } = useLiveData('/api/tickets', initialTickets, !error);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const search = useDeferredValue(query).trim().toLowerCase();
  if (error) return <PageProblem error={error} />;
  const visible = tickets.filter(ticket => ticket.title.toLowerCase().includes(search)
    && (filter !== 'available' || !ticket.orderId)
    && (filter !== 'yours' || ticket.userId === currentUser?.id));

  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-medium uppercase text-stone-500">Marketplace</p><h1 className="text-3xl font-semibold sm:text-4xl">Tickets</h1></div>
      <Link to="/tickets/new" className="button button-primary"><Plus size={17} aria-hidden="true" />New ticket</Link>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-stone-200 py-4">
      <div role="group" aria-label="Filter tickets" className="flex gap-1 rounded-md border border-stone-200 bg-white p-1">
        {[['all', 'All tickets'], ['available', 'Available'], ...(currentUser ? [['yours', 'Yours']] : [])].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded px-3 text-sm ${filter === value ? 'bg-emerald-800 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>{label}</button>)}
      </div>
      <div className="relative w-full sm:w-72"><label htmlFor="ticket-search" className="sr-only">Search tickets</label><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input id="ticket-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tickets" className="field field-search" /></div>
    </div>
    <div className="flex items-center justify-between py-5 text-xs text-stone-500"><p aria-live="polite">{visible.length} {visible.length === 1 ? 'ticket' : 'tickets'}</p><span>Price</span></div>
    {refreshError && <div className="mb-4"><ErrorNotice errors={[{ message: 'Live updates are unavailable. Showing the last loaded tickets.' }]} /></div>}
    {visible.length ? <ul className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
      {visible.map(ticket => <li key={ticket.id}>
        <Link to={`/tickets/${ticket.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-6 transition-colors hover:bg-emerald-50/40 sm:px-6">
          <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><StatusBadge status={ticket.orderId ? 'reserved' : 'available'} />{ticket.userId === currentUser?.id && <span className="text-xs text-stone-500">Your ticket</span>}</div><h2 className="break-words text-lg font-medium text-stone-900 [overflow-wrap:anywhere]">{ticket.title}</h2></div>
          <div className="flex items-center gap-4"><span className="text-lg font-semibold tabular-nums">{formatPrice(ticket.price)}</span><ArrowUpRight size={19} className="hidden text-stone-400 group-hover:text-emerald-700 sm:block" aria-hidden="true" /></div>
        </Link>
      </li>)}
    </ul> : <EmptyState title={search || filter !== 'all' ? 'No matching tickets' : 'No tickets yet'} action={<Link to="/tickets/new" className="button button-secondary"><Plus size={16} aria-hidden="true" />New ticket</Link>} />}
  </>;
}
