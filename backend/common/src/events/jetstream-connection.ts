import { connect, type NatsConnection } from '@nats-io/transport-node';
import { AckPolicy, DeliverPolicy, DiscardPolicy, jetstream, RetentionPolicy, StorageType } from '@nats-io/jetstream';
import type { JetStreamClient, JetStreamManager } from '@nats-io/jetstream';
import { Subjects } from './subjects';

export const EVENT_STREAM = 'TICKETING';

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'status' in error && error.status === 404;
}

export function consumerName(group: string, subject: string): string {
  return `${group}-${subject}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function ensureConsumer(manager: JetStreamManager, group: string, subject: string, ackWait: number): Promise<string> {
  const name = consumerName(group, subject);
  try {
    const existing = await manager.consumers.info(EVENT_STREAM, name);
    if (existing.config.filter_subject !== subject || existing.config.ack_policy !== AckPolicy.Explicit || existing.config.deliver_subject) {
      throw new Error(`Incompatible JetStream consumer: ${name}`);
    }
    return name;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
  try {
    await manager.consumers.add(EVENT_STREAM, {
      durable_name: name,
      name,
      filter_subject: subject,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      ack_wait: ackWait * 1000000,
      max_ack_pending: 64,
    });
  } catch (error) {
    const existing = await manager.consumers.info(EVENT_STREAM, name).catch(() => { throw error; });
    if (existing.config.filter_subject !== subject || existing.config.ack_policy !== AckPolicy.Explicit) throw error;
  }
  return name;
}

export class JetStreamConnection {
  private connection?: NatsConnection;
  private jetstreamClient?: JetStreamClient;

  get client(): JetStreamClient {
    if (!this.jetstreamClient) throw new Error('Cannot access JetStream before connecting');
    return this.jetstreamClient;
  }

  async connect(name: string, url: string): Promise<void> {
    if (this.connection) throw new Error('JetStream is already connected');
    const user = process.env.NATS_USER;
    const pass = process.env.NATS_PASSWORD;
    if (Boolean(user) !== Boolean(pass)) throw new Error('NATS_USER and NATS_PASSWORD must be supplied together');
    const connection = await connect({ servers: url, name, user, pass, maxReconnectAttempts: -1, timeout: 10000 });
    try {
      const client = jetstream(connection);
      const manager = await client.jetstreamManager();
      try {
        await manager.streams.info(EVENT_STREAM);
      } catch (error) {
        if (!isNotFound(error)) throw error;
        try {
          await manager.streams.add({
            name: EVENT_STREAM,
            subjects: Object.values(Subjects),
            storage: StorageType.File,
            retention: RetentionPolicy.Limits,
            discard: DiscardPolicy.New,
            max_bytes: 1024 * 1024 * 1024,
          });
        } catch (creationError) {
          await manager.streams.info(EVENT_STREAM).catch(() => { throw creationError; });
        }
      }
      const stream = await manager.streams.info(EVENT_STREAM);
      if (stream.config.storage !== StorageType.File || !Object.values(Subjects).every(subject => stream.config.subjects?.includes(subject))) {
        throw new Error('Existing TICKETING stream has an incompatible configuration');
      }
      this.connection = connection;
      this.jetstreamClient = client;
      console.log(`Connected to JetStream: ${name}`);
    } catch (error) {
      await connection.close();
      throw error;
    }
  }

  closed(): Promise<void | Error> {
    return this.connection ? this.connection.closed() : Promise.resolve();
  }

  async close(): Promise<void> {
    await this.connection?.drain();
    this.jetstreamClient = undefined;
    this.connection = undefined;
  }
}