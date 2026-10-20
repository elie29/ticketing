# Tickets

Owns ticket titles, prices, owners, versions and reservation references in the `tickets` MongoDB database. Prices have no currency field; the application does not infer one.

## API and Events

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/tickets` | List tickets. |
| GET | `/api/tickets/:id` | Retrieve one ticket. |
| POST | `/api/tickets` | Authenticated creation with title/price validation. |
| PUT | `/api/tickets/:id` | Owner-only update; reserved tickets cannot be edited. |

Publishes `ticket:created` and `ticket:updated`. Consumes `order:created` to reserve a ticket and `order:cancelled` to release it, publishing the resulting versioned ticket update before acknowledging. Optimistic concurrency protects version ordering.

JetStream provides at-least-once delivery, not an exactly-once transaction spanning MongoDB and NATS. Event types and transport come from [common](../common/README.md).

## Development

Start from the repository root with `docker compose up --build -d` or `podman compose up --build -d`; alternatively use the [infrastructure plus watch workflow](../README.md#infrastructure-containers-and-local-watch).

Local port: `3003`. Required settings: `JWT_KEY`, `MONGO_URI`, `NATS_CLIENT`, `NATS_URL`. Mongo authentication uses `MONGO_USR`/`MONGO_PWD`; `SERVER_PORT` is optional. Compose supplies internal DNS names and the root watch launcher supplies localhost defaults. `NATS_CLUSTER_ID` is not used.

## Tests

Run from the repository root after building common:

```bash
npm --prefix tickets run typecheck
npm --prefix tickets run test:ci
```

[test/routes](test/routes), [test/models](test/models) and [test/events/listeners](test/events/listeners) retain HTTP, concurrency and event-handler assertions. [test/setup.ts](test/setup.ts) uses temporary MongoDB and explicitly installs the [NATS mock](test/mocks/nats-wrapper.ts). Tests and mocks are outside production source. Watch: `npm --prefix tickets run test:watch`.

The container setup is for development only. See [root documentation](../README.md) for setup and STAN-to-JetStream cutover caveats.
