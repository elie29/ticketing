import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useSession } from '../session';
import { ArrowRight } from 'lucide-react';
import useRequest from '../hooks/use-request';
import { getReturnPath } from '../lib/ticketing';
import { Button, Field } from './ui';

export default function AuthForm({ signup = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reloadSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const returnTo = getReturnPath(searchParams.get('returnTo') ?? undefined);
  const heading = signup ? 'Sign Up' : 'Sign In';
  const { doRequest, errors, fieldErrors, pending } = useRequest({
    url: `/api/users/${signup ? 'signup' : 'signin'}`, method: 'post', body: { email, password },
    onSuccess: async () => { await reloadSession(); navigate(returnTo); },
  });

  return <section className="mx-auto max-w-md py-6 sm:py-12">
    <p className="mb-3 text-xs font-medium uppercase text-emerald-800">TicTix account</p>
    <h1 className="mb-9 text-3xl font-semibold">{heading}</h1>
    <form onSubmit={async event => { event.preventDefault(); await doRequest(); }} className="space-y-6">
      <Field label="Email Address" id="email" name="email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} error={fieldErrors.email} />
      <Field label="Password" id="password" name="password" type="password" required minLength={4} maxLength={20} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} error={fieldErrors.password} />
      {errors}<Button type="submit" pending={pending} className="w-full">{heading}{!pending && <ArrowRight size={17} aria-hidden="true" />}</Button>
    </form>
    <p className="mt-7 text-sm text-stone-500">{signup ? 'Already have an account?' : 'New to TicTix?'}{' '}<Link to={`${signup ? '/auth/signin' : '/auth/signup'}?returnTo=${encodeURIComponent(returnTo)}`} className="font-medium text-emerald-800 underline decoration-emerald-200 underline-offset-4">{signup ? 'Sign In' : 'Sign Up'}</Link></p>
  </section>;
}