import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import buildClient from './api/build-client';
import { loadSession } from './lib/ticketing';

const SessionContext = createContext(null);

// Re-checks the session on every navigation, as the former Next.js app shell did.
export function SessionProvider({ children }) {
  const { pathname } = useLocation();
  const [session, setSession] = useState({ currentUser: null, sessionError: false, loading: true });
  const latest = useRef(0);

  const reloadSession = useCallback(async () => {
    const request = ++latest.current;
    const next = await loadSession(buildClient());
    if (request === latest.current) setSession({ ...next, loading: false });
  }, []);

  useEffect(() => { reloadSession(); }, [pathname, reloadSession]);

  return <SessionContext.Provider value={{ ...session, reloadSession }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
