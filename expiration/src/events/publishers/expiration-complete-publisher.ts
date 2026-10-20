import { ExpirationCompleteEvent, Publisher, Subjects } from '@elie29/ticketing-common';

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  readonly subject = Subjects.ExpirationComplete;
}
