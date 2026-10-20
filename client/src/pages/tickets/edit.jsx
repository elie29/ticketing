import { Link, useLocation, useParams } from 'react-router';
import TicketForm from '../../components/ticket-form';
import { BackLink, Loading, PageProblem, StatusBadge } from '../../components/ui';
import { canEditTicket } from '../../lib/ticketing';
import usePageData from '../../hooks/use-page-data';
import { useSession } from '../../session';

export default function EditTicketPage() {
  const { ticketId } = useParams();
  const { currentUser } = useSession();
  const { data, error, loading } = usePageData(`/api/tickets/${encodeURIComponent(ticketId)}`, { requireUser: true });
  if (loading) return <Loading />;
  return <EditTicketView ticket={data} error={error} currentUser={currentUser} />;
}

function EditTicketView({ ticket, error, currentUser }) {
  const location = useLocation();
  if (error) return <PageProblem error={error} returnTo={location.pathname + location.search} />;
  if (!currentUser) return <PageProblem error={{ status: 401 }} returnTo={location.pathname + location.search} />;
  return <>
    <BackLink href={`/tickets/${ticket.id}`}>Ticket details</BackLink>
    <h1 className="mb-9 text-3xl font-semibold">Edit ticket</h1>
    {canEditTicket(ticket, currentUser) ? <TicketForm key={ticket.id} ticket={ticket} /> : <div className="space-y-5"><StatusBadge status={ticket.orderId ? 'reserved' : 'available'} /><p className="text-stone-600">{ticket.orderId ? 'This ticket is reserved and cannot be edited.' : 'Only the ticket owner can make changes.'}</p><Link to={`/tickets/${ticket.id}`} className="button button-secondary">Back to ticket</Link></div>}
  </>;
}
