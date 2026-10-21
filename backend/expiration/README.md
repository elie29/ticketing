# Expiration

Background worker with no HTTP server or public port. Consumes `order:created`, schedules a delayed Bull job in Redis, then publishes `expiration:complete` to JetStream. Orders performs the cancellation; tickets releases the reservation after the resulting `order:cancelled` event.

## Delivery and Scheduling

The listener acknowledges only after scheduling succeeds. The queue processor awaits JetStream's publication acknowledgement before completing its job. Publication failure rejects the queue processor rather than claiming successful delivery. The existing implementation uses Bull, not BullMQ; delivery is at least once.

Order expiry comes from the event's `expiresAt`; configure the lifetime on the orders service, not here. This worker owns no MongoDB data.

## Development

From the repository root, start `docker compose up --build -d` or `podman compose up --build -d`. The [local-watch workflow](../../README.md#infrastructure-containers-and-local-watch) runs infrastructure in containers and watches source locally.

Required settings: `NATS_CLIENT`, `NATS_URL`, `REDIS_HOST`, `REDIS_PORT`. Compose uses internal DNS; the root watch launcher uses localhost. `NATS_CLUSTER_ID` is not used. Shared events/transport are provided by the local [common package](../common/README.md).

## Tests

From the repository root after building common:

```bash
npm --prefix backend/expiration run typecheck
npm --prefix backend/expiration run test:ci
```

[test/queues/expiration-queue.test.ts](test/queues/expiration-queue.test.ts) checks scheduling/acknowledgement ordering, failed scheduling, awaited publication and failed publication. Its Bull and [NATS mock](test/mocks/nats-wrapper.ts) are isolated from live infrastructure. Watch: `npm --prefix backend/expiration run test:watch`.

The root live acceptance suite additionally proves automatic expiration and ticket re-reservation through the real worker.
