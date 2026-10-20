import type { JetStreamClient } from '@nats-io/jetstream';

import { Subjects } from './subjects';

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class Publisher<T extends Event> {
  abstract subject: T["subject"];
  protected client: JetStreamClient;

  constructor(client: JetStreamClient) {
    this.client = client;
  }

  async publish(data: T["data"]): Promise<void> {
    await this.client.publish(this.subject, new TextEncoder().encode(JSON.stringify(data)));
    console.log("Event published to subject", this.subject);
  }
}
