import { Publisher, Subjects, TicketUpdatedEvent } from '@elie29/ticketing-common';

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  readonly subject = Subjects.TicketUpdated;
}
