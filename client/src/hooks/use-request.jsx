import { useRef, useState } from 'react';
import buildClient from '../api/build-client';
import { requestJson } from '../lib/ticketing';
import { ErrorNotice } from '../components/ui';

export default ({ url, method, body, onSuccess }) => {
  const [messages, setErrors] = useState(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const doRequest = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      setErrors(null);
      const data = await requestJson(buildClient(), url, {
        method: method.toUpperCase(),
        headers: { 'content-type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
      });

      if (onSuccess) {
        await onSuccess(data);
      }

      return data;
    } catch (err) {
      setErrors(err.errors || [{ message: 'Unable to reach the service. Please try again.' }]);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return {
    doRequest,
    errors: <ErrorNotice errors={messages} />,
    pending,
    fieldErrors: Object.fromEntries((messages || []).filter(error => error.field).map(error => [error.field, error.message]))
  };
};
