import TicketForm from '../../components/ticket-form';
import { BackLink, PageProblem } from '../../components/ui';

export default function NewTicketPage({ currentUser }) {
  if (!currentUser) return <PageProblem error={{ status: 401 }} returnTo="/tickets/new" />;
  return <><BackLink /><h1 className="mb-9 text-3xl font-semibold">New ticket</h1><TicketForm /></>;
}