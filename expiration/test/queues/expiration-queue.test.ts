import { OrderCreatedEvent, OrderStatus, Subjects } from '@elie29/ticketing-common';
import type { EventMessage as Message } from "@elie29/ticketing-common";
import type { Mock } from "vitest";

import { OrderCreatedListener } from '../../src/events/listeners/order-created-listener';
import { natsWrapper } from '../../src/nats-wrapper';
import { expirationQueue } from '../../src/queues/expiration-queue';

vi.mock("../../src/nats-wrapper", () => import("../mocks/nats-wrapper.js"));
vi.mock('bull', () => ({
  default: class {
    add = vi.fn();
    process = vi.fn();
  },
}));

const queue = expirationQueue as unknown as { add: Mock; process: Mock };
const processJob = queue.process.mock.calls[0][0] as (
  job: { data: { orderId: string } }
) => Promise<void>;
const publish = natsWrapper.client.publish as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  queue.add.mockReset();
  publish.mockResolvedValue({ stream: 'TICKETING', seq: 1, duplicate: false });
});

afterEach(() => vi.useRealTimers());

function orderCreated(): OrderCreatedEvent['data'] {
  return {
    id: 'order-123',
    version: 0,
    status: OrderStatus.Created,
    userId: 'user-123',
    expiresAt: '2026-10-20T12:15:00.000Z',
    ticket: { id: 'ticket-123', price: 25 },
  };
}

it('schedules the order for its expiry and acknowledges after scheduling succeeds', async () => {
  vi.useFakeTimers({ now: new Date('2026-10-20T12:00:00.000Z') });
  let finishScheduling!: () => void;
  queue.add.mockReturnValue(new Promise<void>(resolve => { finishScheduling = resolve; }));
  const ack = vi.fn();
  const listener = new OrderCreatedListener(natsWrapper.client);
  const completion = listener.onMessage(orderCreated(), { ack } as unknown as Message);

  expect(queue.add).toHaveBeenCalledWith({ orderId: 'order-123' }, { delay: 900000 });
  expect(ack).not.toHaveBeenCalled();
  finishScheduling();
  await completion;
  expect(ack).toHaveBeenCalledTimes(1);
});

it('leaves an order event unacknowledged when scheduling fails', async () => {
  const failure = new Error('Redis unavailable');
  queue.add.mockRejectedValue(failure);
  const ack = vi.fn();
  const listener = new OrderCreatedListener(natsWrapper.client);

  await expect(listener.onMessage(orderCreated(), { ack } as unknown as Message)).rejects.toThrow(failure);
  expect(ack).not.toHaveBeenCalled();
});

it('waits for the expiration publication before completing the queue job', async () => {
  let finishPublishing!: () => void;
  publish.mockImplementation((subject: string, data: Uint8Array) => {
    expect(subject).toBe(Subjects.ExpirationComplete);
    expect(JSON.parse(new TextDecoder().decode(data))).toEqual({ orderId: 'order-123' });
    return new Promise<void>(resolve => { finishPublishing = resolve; });
  });
  let complete = false;
  const completion = processJob({ data: { orderId: 'order-123' } }).then(() => { complete = true; });
  await Promise.resolve();
  expect(complete).toBe(false);
  finishPublishing();
  await completion;
  expect(complete).toBe(true);
});

it('fails the queue job when publishing the expiration event fails', async () => {
  const failure = new Error('NATS unavailable');
  publish.mockRejectedValue(failure);
  await expect(processJob({ data: { orderId: 'order-123' } })).rejects.toThrow(failure);
});