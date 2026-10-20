import { Link } from 'react-router';

export default function NotFoundPage() {
  return <section className="py-12">
    <h1 className="mb-4 text-3xl font-semibold">Page not found</h1>
    <Link to="/" className="font-medium text-emerald-800 underline decoration-emerald-200 underline-offset-4">Back to tickets</Link>
  </section>;
}
