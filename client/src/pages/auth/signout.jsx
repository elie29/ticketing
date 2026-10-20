import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../session';
import useRequest from '../../hooks/use-request';
import { Button } from '../../components/ui';

export default function SignOutPage() {
  const navigate = useNavigate();
  const { reloadSession } = useSession();
  const { doRequest, errors, pending } = useRequest({
    url: '/api/users/signout',
    method: 'post',
    body: {},
    onSuccess: async () => { await reloadSession(); navigate('/'); }
  });

  useEffect(() => {
    doRequest();
  }, []);

  return <section className="mx-auto max-w-md space-y-6 py-12"><h1 className="text-3xl font-semibold">Signing you out...</h1>{errors}{!pending && <Button onClick={doRequest}>Try again</Button>}</section>;
}
