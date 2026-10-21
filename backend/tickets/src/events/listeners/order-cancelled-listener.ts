import { Listener, OrderCancelledEvent, Subjects } from '@elie29/ticketing-common';
import type { EventMessage as Message } from "@elie29/ticketing-common";

import { Ticket } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';
import { TICKETS_SERVICE } from './queue-group-name';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  readonly subject = Subjects.OrderCancelled;

  readonly queueGroupName = TICKETS_SERVICE;

  async onMessage(data: OrderCancelledEvent["data"], msg: Message) {
    // Find the ticket that the order has be reserved to
    const ticket = await Ticket.findById(data.ticket.id);

    // If no ticket, throw error
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Mark the ticket as being unreserved
    ticket.set({ orderId: undefined });

    // Save the ticket
    await ticket.save();

    // prevents other services to increment version
    await new TicketUpdatedPublisher(this.client).publish({
      id: ticket.id,
      price: ticket.price,
      title: ticket.title,
      userId: ticket.userId,
      orderId: ticket.orderId,
      version: ticket.version,
    });

    msg.ack();
  }
}
