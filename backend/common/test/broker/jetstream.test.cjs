const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { JetStreamConnection, ensureConsumer, Subjects, EVENT_STREAM } = require('../../build');

const url = process.env.NATS_TEST_URL;
let connection;
beforeEach(async () => {
  assert.ok(url, 'Set NATS_TEST_URL to a dedicated test broker, never the application broker');
  connection = new JetStreamConnection();
  await connection.connect('integration-test', url);
});
afterEach(async () => { await connection?.close(); });

test('replays stored events independently and resumes a durable consumer after reconnect', async () => {
  const group = `verify-${randomUUID()}`;
  const client = connection.client;
  const manager = await client.jetstreamManager();
  assert.equal((await manager.streams.info(EVENT_STREAM)).config.storage, 'file');
  const first = { id: randomUUID() };
  const subject = Subjects.TicketCreated;
  const published = await client.publish(subject, new TextEncoder().encode(JSON.stringify(first)));
  const name = await ensureConsumer(manager, group, subject, 1000);
  const consumer = await client.consumers.get(EVENT_STREAM, name);
  let message;
  do {
    message = await consumer.next({ expires: 2000 });
    assert.ok(message, 'Stored event must replay');
    message.ack();
  } while (message.seq !== published.seq);
  assert.deepEqual(message.json(), first);
  const independent = await ensureConsumer(manager, `${group}-independent`, subject, 1000);
  const other = await client.consumers.get(EVENT_STREAM, independent);
  let replay;
  do {
    replay = await other.next({ expires: 2000 });
    assert.ok(replay, 'Independent subscriber must receive its own replay');
    replay.ack();
  } while (replay.seq !== published.seq);
  assert.deepEqual(replay.json(), first);
  await consumer.info();
  const second = { id: randomUUID() };
  await client.publish(subject, new TextEncoder().encode(JSON.stringify(second)));
  await connection.close();
  connection = new JetStreamConnection();
  await connection.connect('integration-test-resume', url);
  const resumed = await connection.client.consumers.get(EVENT_STREAM, name);
  const next = await resumed.next({ expires: 2000 });
  assert.ok(next);
  assert.deepEqual(next.json(), second, 'Reconnect must resume after the acknowledged event');
  next.ack();
});

test('redelivers an unacknowledged event rather than silently losing it', async () => {
  const client = connection.client;
  const manager = await client.jetstreamManager();
  const subject = Subjects.ExpirationComplete;
  const name = await ensureConsumer(manager, `redelivery-${randomUUID()}`, subject, 200);
  const consumer = await client.consumers.get(EVENT_STREAM, name);
  await client.publish(subject, new TextEncoder().encode(JSON.stringify({ orderId: randomUUID() })));
  const first = await consumer.next({ expires: 2000 });
  assert.ok(first);
  const repeated = await consumer.next({ expires: 2000 });
  assert.ok(repeated, 'Broker must retry after ack_wait');
  assert.equal(repeated.seq, first.seq);
  assert.deepEqual(repeated.json(), first.json());
  repeated.ack();
});