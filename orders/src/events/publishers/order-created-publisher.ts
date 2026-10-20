import { OrderCreatedEvent, Publisher, Subjects } from '@elie29/ticketing-common';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
}
