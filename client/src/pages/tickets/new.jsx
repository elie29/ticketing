import TicketForm from '../../components/ticket-form';
import { BackLink, Loading, PageProblem } from '../../components/ui';
import { useSession } from '../../session';

export default function NewTicketPage() {
  const { currentUser, loading } = useSession();
  if (loading) return <Loading />;
  if (!currentUser) return <PageProblem error={{ status: 401 }} returnTo="/tickets/new" />;
  return <><BackLink /><h1 className="mb-9 text-3xl font-semibold">New ticket</h1><TicketForm /></>;
}