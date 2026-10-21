import { Publisher, Subjects, TicketCreatedEvent } from '@elie29/ticketing-common';

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = Subjects.TicketCreated;
}
