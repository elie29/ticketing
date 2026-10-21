import { Listener, Subjects, TicketCreatedEvent } from '@elie29/ticketing-common';
import type { EventMessage as Message } from "@elie29/ticketing-common";

import { Ticket } from '../../models/ticket';
import { ORDERS_SERVICE } from './queue-group-name';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  // this is the topic name
  readonly subject = Subjects.TicketCreated;

  // messages would be dispatched to all instances of this group
  readonly queueGroupName = ORDERS_SERVICE;

  /**
   * process the data to consume: in our case, save the ticket
   * in orders mongodb collections,
   * so we don't need later to call tickets microservice to get
   * info about the ticket the user needs to order
   */
  async onMessage(data: TicketCreatedEvent["data"], message: Message) {
    // create a ticket (id, price && title are only needed)
    const { id, title, price } = { ...data };
    const ticket = Ticket.build({ id, title, price });

    // save it
    await ticket.save();

    // commit the message
    message.ack();
  }
}
