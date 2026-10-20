import { OrderCancelledEvent, Publisher, Subjects } from '@elie29/ticketing-common';

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
}
