import mongoose from 'mongoose';

import { app } from './app';
import { OrderCancelledListener } from './events/listeners/order-cancelled-listener';
import { OrderCreatedListener } from './events/listeners/order-created-listener';
import { natsWrapper } from './nats-wrapper';

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error("JWT_KEY must be defined");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be defined");
  }
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

    await mongoose.connect(process.env.MONGO_URI, {
      authSource: "admin",
      user: process.env.MONGO_USR,
      pass: process.env.MONGO_PWD,
    });
    console.log(`Connected to MongoDb: ${process.env.MONGO_URI}`);

    // listen to events
    await new OrderCancelledListener(natsWrapper.client).listen();
    await new OrderCreatedListener(natsWrapper.client).listen();
  } catch (err) {
    await natsWrapper.close();
    throw err;
  }

  const PORT = process.env.SERVER_PORT || 3003;
  const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await natsWrapper.close();
    await mongoose.disconnect();
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
