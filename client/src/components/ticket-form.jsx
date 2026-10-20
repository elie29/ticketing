import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, Plus } from 'lucide-react';
import useRequest from '../hooks/use-request';
import { Button, ErrorNotice, Field } from './ui';

export default function TicketForm({ ticket }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(ticket?.title || '');
  const [price, setPrice] = useState(ticket ? String(ticket.price) : '');
  const [localErrors, setLocalErrors] = useState(null);
  const { doRequest, errors, fieldErrors, pending } = useRequest({
    url: ticket ? `/api/tickets/${ticket.id}` : '/api/tickets',
    method: ticket ? 'put' : 'post',
    body: { title: title.trim(), price: Number(price) },
    onSuccess: next => navigate(`/tickets/${next.id}`),
  });

  const submit = async event => {
    event.preventDefault();
    if (!title.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      setLocalErrors([{ message: 'Enter a title and a price greater than zero.' }]);
      return;
    }
    setLocalErrors(null);
    await doRequest();
  };

  return <form onSubmit={submit} className="max-w-xl space-y-6">
    <Field id="ticket-title" label="Title" name="title" required value={title} onChange={event => setTitle(event.target.value)} error={fieldErrors.title} autoComplete="off" />
    <Field id="ticket-price" label="Price" name="price" type="number" inputMode="decimal" required min="0" step="any" value={price} onChange={event => setPrice(event.target.value)} error={fieldErrors.price} />
    <ErrorNotice errors={localErrors} />{errors}
    <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-6">
      <Button type="submit" pending={pending}>{!pending && (ticket ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />)}{ticket ? 'Save changes' : 'Create ticket'}</Button>
      <Link to={ticket ? `/tickets/${ticket.id}` : '/'} className="button button-secondary">Cancel</Link>
    </div>
  </form>;
}