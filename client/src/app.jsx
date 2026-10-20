import { Route, Routes, useLocation } from 'react-router';
import ErrorBoundary from './components/error-boundary';
import Header from './components/header';
import { ErrorNotice } from './components/ui';
import { useSession } from './session';
import TicketsPage from './pages/index';
import SignInPage from './pages/auth/signin';
import SignUpPage from './pages/auth/signup';
import SignOutPage from './pages/auth/signout';
import NewTicketPage from './pages/tickets/new';
import TicketPage from './pages/tickets/ticket';
import EditTicketPage from './pages/tickets/edit';
import OrdersPage from './pages/orders/index';
import OrderPage from './pages/orders/order';
import NotFoundPage from './pages/not-found';

export default function App() {
  const { currentUser, sessionError, loading } = useSession();
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-50 bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Header currentUser={currentUser} loading={loading} />
      <main id="main" className="page-enter mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        {sessionError && <div className="mb-6"><ErrorNotice errors={[{ message: 'The account service is unavailable. Please try again shortly.' }]} /></div>}
        <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<TicketsPage />} />
            <Route path="/auth/signin" element={<SignInPage />} />
            <Route path="/auth/signup" element={<SignUpPage />} />
            <Route path="/auth/signout" element={<SignOutPage />} />
            <Route path="/tickets/new" element={<NewTicketPage />} />
            <Route path="/tickets/:ticketId" element={<TicketPage />} />
            <Route path="/tickets/:ticketId/edit" element={<EditTicketPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
