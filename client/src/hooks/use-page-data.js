import { useEffect, useState } from 'react';
import { loadPageData, pageStateFor } from '../lib/ticketing';
import { useSession } from '../session';

export default function usePageData(pathname, { requireUser = false } = {}) {
  const session = useSession();
  const [state, setState] = useState({ pathname: null, data: null, error: null, loading: true });
  const userId = session.currentUser?.id;

  useEffect(() => {
    if (session.loading) return;
    let active = true;
    setState(current => ({ ...current, loading: true }));
    loadPageData(session, pathname, requireUser).then(result => {
      if (active) setState({ ...result, pathname, loading: false });
    });
    return () => { active = false; };
    // The session object changes on every navigation; only the user and its availability matter here.
  }, [pathname, requireUser, session.loading, session.sessionError, userId]);

  return pageStateFor(state, pathname);
}
