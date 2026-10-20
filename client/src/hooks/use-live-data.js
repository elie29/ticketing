import { useEffect, useState } from 'react';
import buildClient from '../api/build-client';
import { requestJson } from '../lib/ticketing';

export default function useLiveData(pathname, initialData, enabled = true) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  useEffect(() => { setData(initialData); setError(null); }, [initialData, pathname]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let loading = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const next = await requestJson(buildClient(), pathname, { signal: controller.signal });
        if (active) { setData(next); setError(null); }
      } catch (failure) {
        if (active && failure.name !== 'AbortError') setError(failure);
      } finally { loading = false; }
    };
    const interval = setInterval(refresh, 3000);
    window.addEventListener('focus', refresh);
    return () => { active = false; controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [pathname, enabled]);

  return { data, setData, error };
}