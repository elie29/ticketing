import Link from 'next/link';
import { useRouter } from 'next/router';
import TicketForm from '../../../components/ticket-form';
import { BackLink, PageProblem, StatusBadge } from '../../../components/ui';
import { canEditTicket, loadPageData } from '../../../lib/ticketing';

export default function EditTicketPage({ ticket, error, currentUser }) {
  const router = useRouter();
  if (error) return <PageProblem error={error} returnTo={router.asPath} />;
  if (!currentUser) return <PageProblem error={{ status: 401 }} returnTo={router.asPath} />;
  return <>
    <BackLink href={`/tickets/${ticket.id}`}>Ticket details</BackLink>
    <h1 className="mb-9 text-3xl font-semibold">Edit ticket</h1>
    {canEditTicket(ticket, currentUser) ? <TicketForm key={ticket.id} ticket={ticket} /> : <div className="space-y-5"><StatusBadge status={ticket.orderId ? 'reserved' : 'available'} /><p className="text-stone-600">{ticket.orderId ? 'This ticket is reserved and cannot be edited.' : 'Only the ticket owner can make changes.'}</p><Link href={`/tickets/${ticket.id}`} className="button button-secondary">Back to ticket</Link></div>}
  </>;
}

EditTicketPage.getInitialProps = async context => {
  const { data, error } = await loadPageData(context, `/api/tickets/${encodeURIComponent(context.query.ticketId)}`, true);
  return { ticket: data, error };
};