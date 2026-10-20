import Queue from 'bull';

import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher';
import { natsWrapper } from '../nats-wrapper';

interface Payload {
  orderId: string;
}

const REDIS_QUEUE_NAME = "order:expiration";

const expirationQueue = new Queue<Payload>(REDIS_QUEUE_NAME, {
  redis: {
    port: +process.env.REDIS_PORT!,
    host: process.env.REDIS_HOST,
  },
});

// Process the job when the delay expires$
expirationQueue.process(async job => {
  // Publish a message
  await new ExpirationCompletePublisher(natsWrapper.client).publish({
    orderId: job.data.orderId,
  });
});

export { expirationQueue };
