# Orders

Owns orders and a local, versioned ticket projection in the `orders` MongoDB database. The projection is updated asynchronously from ticket events; the service does not read the tickets database directly.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/orders` | List the authenticated user's orders. |
| GET | `/api/orders/:id` | Retrieve an owned order. |
| POST | `/api/orders` | Reserve an available projected ticket using `{ ticketId }`. |
| DELETE | `/api/orders/:id` | Cancel an owned order and publish its cancellation. |

Consumes `ticket:created`, `ticket:updated` and `expiration:complete`. Publishes `order:created` and `order:cancelled`. Tickets reacts to cancellation by releasing its reservation; expiration is scheduled independently by the expiration worker.

`ORDER_EXPIRATION_SECONDS` defaults to `900` and must be a positive integer. The acceptance launcher uses `15`; restore ordinary startup afterward. The API's confirmed status is authoritative, not a client's elapsed countdown. No payment service or payment UI is implemented.

## Development

From the repository root: `docker compose up --build -d` or `podman compose up --build -d`. For local source watchers, use the [root development workflow](../README.md#infrastructure-containers-and-local-watch).

Local port: `3002`. Settings: `JWT_KEY`, `MONGO_URI`, `MONGO_USR`, `MONGO_PWD`, `NATS_CLIENT`, `NATS_URL`; optional `SERVER_PORT` and `ORDER_EXPIRATION_SECONDS`. The private [common](../common/README.md) dependency is linked locally. No `NATS_CLUSTER_ID` is needed.

## Tests

```bash
npm --prefix orders run typecheck
npm --prefix orders run test:ci
```

Run these from the repository root after building common. Specs are in [test/routes](test/routes), [test/events/listeners](test/events/listeners) and [test/config.test.ts](test/config.test.ts). [test/setup.ts](test/setup.ts) starts temporary MongoDB and explicitly wires the mock transport. Watch: `npm --prefix orders run test:watch`.

Live automatic-expiration coverage is in the root acceptance suite and uses real MongoDB, Bull/Redis and JetStream. Containers are development-only.