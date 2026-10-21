import { Listener, OrderCreatedEvent, Subjects } from '@elie29/ticketing-common';
import type { EventMessage as Message } from "@elie29/ticketing-common";

import { expirationQueue } from '../../queues/expiration-queue';
import { EXPIRATION_SERVICE } from './queue-group-name';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  readonly subject = Subjects.OrderCreated;
  readonly queueGroupName = EXPIRATION_SERVICE;

  async onMessage(data: OrderCreatedEvent["data"], msg: Message) {
    const delay = new Date(data.expiresAt).getTime() - new Date().getTime();
    console.log("Waiting this many milliseconds to process the job:", delay);

    // Add the orderId in the queue and wait before processing the job
    await expirationQueue.add(
      {
        orderId: data.id,
      },
      {
        delay,
      }
    );

    msg.ack();
  }
}
