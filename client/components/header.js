import Link from 'next/link';
import { useRouter } from 'next/router';
import { ListOrdered, LogOut, Plus, Ticket } from 'lucide-react';

export default function Header({ currentUser }) {
  const { pathname } = useRouter();
  const navClass = active => `inline-flex min-h-11 items-center gap-2 border-b-2 px-1 text-sm ${active ? 'border-emerald-700 font-medium text-emerald-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`;
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-5 pt-4 sm:px-8">
        <Link href="/" className="mb-3 inline-flex items-center gap-2.5 text-2xl font-semibold text-stone-900"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-800 text-white"><Ticket size={22} aria-hidden="true" /></span>TicTix<span className="h-1.5 w-1.5 self-start rounded-full bg-orange-500" aria-hidden="true" /></Link>
        <div className="mb-3 flex min-w-0 items-center gap-3 text-sm">
          {currentUser ? <><span className="hidden max-w-48 truncate text-stone-500 sm:block">{currentUser.email}</span><Link href="/auth/signout" className="inline-flex min-h-11 items-center gap-2 text-stone-600 hover:text-stone-900"><LogOut size={16} aria-hidden="true" />Sign Out</Link></> : <><Link href="/auth/signin" className="px-2 py-2.5 text-stone-700">Sign In</Link><Link href="/auth/signup" className="button button-secondary">Sign Up</Link></>}
        </div>
        <nav aria-label="Main" className="flex w-full items-center gap-7">
          <Link href="/" aria-current={pathname === '/' || pathname.startsWith('/tickets') ? 'page' : undefined} className={navClass(pathname === '/' || pathname.startsWith('/tickets'))}><Ticket size={17} aria-hidden="true" />Tickets</Link>
          <Link href="/orders" aria-current={pathname.startsWith('/orders') ? 'page' : undefined} className={navClass(pathname.startsWith('/orders'))}><ListOrdered size={17} aria-hidden="true" />My Orders</Link>
          {currentUser && <Link href="/tickets/new" className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-emerald-800"><Plus size={17} aria-hidden="true" />New ticket</Link>}
        </nav>
      </div>
    </header>
  );
}
