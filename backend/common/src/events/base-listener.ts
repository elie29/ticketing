import type { ConsumerMessages, JetStreamClient, JsMsg } from '@nats-io/jetstream';
import type { EventMessage } from './event-message';
import { ensureConsumer, EVENT_STREAM } from './jetstream-connection';
import { Subjects } from './subjects';

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class Listener<T extends Event> {
  abstract subject: T["subject"];
  abstract queueGroupName: string;
  abstract onMessage(data: T["data"], msg: EventMessage): void | Promise<void>;
  protected client: JetStreamClient;
  protected ackWait = 5 * 1000;

  constructor(client: JetStreamClient) {
    this.client = client;
  }

  async listen(): Promise<ConsumerMessages> {
    const manager = await this.client.jetstreamManager();
    const name = await ensureConsumer(manager, this.queueGroupName, this.subject, this.ackWait);
    const consumer = await this.client.consumers.get(EVENT_STREAM, name);
    const messages = await consumer.consume({ max_messages: 1 });
    void this.process(messages).catch(error => {
      console.error(`JetStream consumer stopped: ${name}`, error);
      process.exit(1);
    });
    return messages;
  }

  async handleMessage(message: JsMsg): Promise<void> {
    const heartbeat = setInterval(() => message.working(), Math.max(100, Math.floor(this.ackWait / 2)));
    heartbeat.unref();
    try {
      await this.onMessage(this.parseMessage(message), message);
    } catch (error) {
      console.error(`JetStream handler failed: ${this.subject}`, error);
      message.nak(1000);
    } finally {
      clearInterval(heartbeat);
    }
  }

  private async process(messages: ConsumerMessages): Promise<void> {
    for await (const message of messages) await this.handleMessage(message);
  }

  parseMessage(message: Pick<JsMsg, 'data'>): T['data'] {
    return JSON.parse(new TextDecoder().decode(message.data));
  }
}
