import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Pencil, Ticket } from 'lucide-react';
import useRequest from '../../../hooks/use-request';
import useLiveData from '../../../hooks/use-live-data';
import { canEditTicket, formatPrice, loadPageData } from '../../../lib/ticketing';
import { BackLink, Button, ErrorNotice, PageProblem, StatusBadge } from '../../../components/ui';

export default function TicketPage({ initialTicket, error, currentUser }) {
  const router = useRouter();
  const { data: ticket, error: refreshError } = useLiveData(`/api/tickets/${initialTicket?.id || ''}`, initialTicket, !error);
  const { doRequest, errors, pending } = useRequest({
    url: '/api/orders', method: 'post', body: { ticketId: ticket?.id },
    onSuccess: order => router.push(`/orders/${order.id}`),
  });
  if (error) return <PageProblem error={error} returnTo={router.asPath} />;

  return <>
    <BackLink />
    <section className="grid gap-10 border-y border-stone-200 bg-white px-6 py-10 sm:px-10 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0"><div className="mb-6 flex flex-wrap items-center gap-3"><Ticket size={24} className="text-emerald-800" aria-hidden="true" /><StatusBadge status={ticket.orderId ? 'reserved' : 'available'} />{ticket.userId === currentUser?.id && <span className="text-sm text-stone-500">Your ticket</span>}</div><h1 className="break-words text-3xl font-semibold [overflow-wrap:anywhere]">{ticket.title}</h1></div>
      <div className="space-y-5 md:border-l md:border-stone-200 md:pl-8"><div><p className="mb-1 text-sm text-stone-500">Price</p><p className="text-3xl font-semibold tabular-nums">{formatPrice(ticket.price)}</p></div>
        {ticket.orderId ? <Button disabled className="w-full">Reserved</Button> : currentUser ? <Button className="w-full" pending={pending} onClick={doRequest}>Reserve ticket{!pending && <ArrowRight size={17} aria-hidden="true" />}</Button> : <Link href={{ pathname: '/auth/signin', query: { returnTo: router.asPath } }} className="button button-primary w-full">Sign in to reserve<ArrowRight size={17} aria-hidden="true" /></Link>}
        {canEditTicket(ticket, currentUser) && <Link href={`/tickets/${ticket.id}/edit`} className="button button-secondary w-full"><Pencil size={16} aria-hidden="true" />Edit ticket</Link>}
        {errors}
      </div>
    </section>
    {refreshError && <div className="mt-5"><ErrorNotice errors={[{ message: 'Availability could not be refreshed. Please try again before reserving.' }]} /></div>}
  </>;
}

TicketPage.getInitialProps = async context => {
  const { data, error } = await loadPageData(context, `/api/tickets/${encodeURIComponent(context.query.ticketId)}`);
  return { initialTicket: data, error };
};