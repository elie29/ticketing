import { useEffect } from 'react';
import Router from 'next/router';
import useRequest from '../../hooks/use-request';
import { Button } from '../../components/ui';

export default function SignOutPage() {
  const { doRequest, errors, pending } = useRequest({
    url: '/api/users/signout',
    method: 'post',
    body: {},
    onSuccess: () => Router.push('/')
  });

  useEffect(() => {
    doRequest();
  }, []);

  return <section className="mx-auto max-w-md space-y-6 py-12"><h1 className="text-3xl font-semibold">Signing you out...</h1>{errors}{!pending && <Button onClick={doRequest}>Try again</Button>}</section>;
}
