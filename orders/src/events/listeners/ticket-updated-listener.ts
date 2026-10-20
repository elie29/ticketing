import { Listener, Subjects, TicketUpdatedEvent } from '@elie29/ticketing-common';
import type { EventMessage as Message } from "@elie29/ticketing-common";

import { Ticket } from '../../models/ticket';
import { ORDERS_SERVICE } from './queue-group-name';

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  // this is the topic name
  readonly subject = Subjects.TicketUpdated;

  // messages would be dispatched to all instances of this group
  readonly queueGroupName = ORDERS_SERVICE;

  /**
   * process the data to consume: in our case, save the ticket
   * in orders mongodb collections,
   * so we don't need later to call tickets microservice to get
   * info about the ticket the user needs to order
   */
  async onMessage(data: TicketUpdatedEvent["data"], message: Message) {
    const ticket = await Ticket.findByEvent(data);

    if (!ticket) {
      throw new Error("not found");
    }

    const { title, price } = data;
    ticket.set({ title, price });

    await ticket.save();

    // commit the message
    message.ack();
  }
}
