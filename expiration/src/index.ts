// To include env everywhere because imports are hoisted first
import './config';

import { OrderCreatedListener } from './events/listeners/order-created-listener';
import { natsWrapper } from './nats-wrapper';
import { expirationQueue } from './queues/expiration-queue';

const start = async () => {
  if (!process.env.NATS_CLIENT) {
    throw new Error("NATS_CLIENT must be defined");
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL must be defined");
  }
  try {
    await natsWrapper.connect(
      process.env.NATS_CLIENT,
      process.env.NATS_URL
    );

    await new OrderCreatedListener(natsWrapper.client).listen();
  } catch (err) {
    await natsWrapper.close();
    throw err;
  }
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await expirationQueue.close();
    await natsWrapper.close();
    process.exit(0);
  };
  const stop = () => { void shutdown().catch(error => { console.error(error); process.exit(1); }); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  void natsWrapper.closed().then(error => {
    if (!stopping) { console.error('JetStream connection closed unexpectedly', error); process.exit(1); }
  });
};

start().catch(error => { console.error(error); process.exit(1); });
