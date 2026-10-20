const assert = require('node:assert/strict');
const { consumerName, ensureConsumer, Listener, Publisher, Subjects } = require('../build');
const { JetStreamApiError } = require('@nats-io/jetstream');

test('publishes JSON bytes and waits for the persistence acknowledgement', async () => {
  let acknowledge;
  let sent;
  const client = {
    publish(subject, data) {
      sent = { subject, data };
      return new Promise(resolve => { acknowledge = resolve; });
    },
  };
  class TicketPublisher extends Publisher {
    subject = Subjects.TicketCreated;
  }
  const payload = { id: 'ticket-1', version: 0, title: 'Concert', price: 25, userId: 'user-1' };
  let completed = false;
  const operation = new TicketPublisher(client).publish(payload).then(() => { completed = true; });
  assert.equal(sent.subject, Subjects.TicketCreated);
  assert.ok(sent.data instanceof Uint8Array);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(sent.data)), payload);
  await Promise.resolve();
  assert.equal(completed, false);
  acknowledge({ stream: 'TICKETING', seq: 1, duplicate: false });
  await operation;
  assert.equal(completed, true);
});

test('rejects publication when persistence acknowledgement fails', async () => {
  const failure = new Error('JetStream unavailable');
  class TicketPublisher extends Publisher { subject = Subjects.TicketCreated; }
  await assert.rejects(new TicketPublisher({ publish: async () => { throw failure; } }).publish({}), failure);
});

test('keeps durable consumers stable and independent per subscriber and subject', () => {
  assert.equal(consumerName('orders-service', Subjects.TicketCreated), 'orders-service-ticket_created');
  assert.notEqual(consumerName('tickets-service', Subjects.OrderCreated), consumerName('expiration-service', Subjects.OrderCreated));
  assert.notEqual(consumerName('orders-service', Subjects.TicketCreated), consumerName('orders-service', Subjects.TicketUpdated));
});

test('creates missing consumers using the client HTTP status rather than its JetStream error code', async () => {
  const missing = new JetStreamApiError({ code: 404, err_code: 10014, description: 'consumer not found' });
  assert.equal(missing.status, 404);
  assert.equal(missing.code, 10014);
  const add = vi.fn().mockResolvedValue({});
  const manager = { consumers: { info: vi.fn().mockRejectedValue(missing), add } };
  const name = await ensureConsumer(manager, 'orders-service', Subjects.TicketCreated, 5000);
  assert.equal(name, 'orders-service-ticket_created');
  assert.equal(add.mock.calls[0][0], 'TICKETING');
  assert.equal(add.mock.calls[0][1].ack_wait, 5000000000);
  assert.equal(add.mock.calls[0][1].filter_subject, Subjects.TicketCreated);
  assert.equal(add.mock.calls[0][1].ack_policy, 'explicit');
});

test('waits for handlers and leaves successful acknowledgement to the domain listener', async () => {
  let finish;
  const ack = vi.fn();
  const nak = vi.fn();
  class TestListener extends Listener {
    subject = Subjects.OrderCreated;
    queueGroupName = 'test';
    async onMessage(data, message) {
      assert.deepEqual(data, { id: 'order-1' });
      await new Promise(resolve => { finish = resolve; });
      message.ack();
    }
  }
  let completed = false;
  const task = new TestListener({}).handleMessage({ data: new TextEncoder().encode('{"id":"order-1"}'), ack, nak, working: vi.fn() })
    .then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  assert.equal(ack.mock.calls.length, 0);
  finish();
  await task;
  assert.equal(ack.mock.calls.length, 1);
  assert.equal(nak.mock.calls.length, 0);
});

test('requests redelivery rather than acknowledging a failed handler', async () => {
  const ack = vi.fn();
  const nak = vi.fn();
  class FailingListener extends Listener {
    subject = Subjects.OrderCreated;
    queueGroupName = 'test';
    async onMessage() { throw new Error('Database unavailable'); }
  }
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await new FailingListener({}).handleMessage({ data: new TextEncoder().encode('{}'), ack, nak, working: vi.fn() });
    assert.equal(ack.mock.calls.length, 0);
    assert.deepEqual(nak.mock.calls, [[1000]]);
  } finally { log.mockRestore(); }
});