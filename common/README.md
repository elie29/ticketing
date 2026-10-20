# Common

Private TypeScript package `@elie29/ticketing-common`, consumed as `file:../common` by auth, tickets, orders and expiration. No registry publication, npm credentials or Git push is needed to use a local change.

## Contracts

- HTTP error classes and middleware preserve the shared `{ errors: [...] }` response and validation field names.
- Authentication middleware reads the shared JWT session.
- Event types define existing ticket/order/expiration payloads and subjects.
- `Publisher` encodes JSON bytes and awaits JetStream persistence acknowledgement.
- `Listener` uses stable durable pull consumers per group/subject, awaits handlers, sends processing heartbeats and negatively acknowledges handler failures. Domain listeners explicitly acknowledge after their work succeeds.
- `JetStreamConnection` provisions the file-backed `TICKETING` stream, validates configuration and supports draining. Optional `NATS_USER`/`NATS_PASSWORD` must be supplied together.

Delivery is at least once. There is no outbox or exactly-once database/broker transaction. STAN history and durable positions are not compatible with JetStream; see [cutover guidance](../README.md#technology-responsibilities).

## Build and Test

Use Node 24 and run commands from the repository root:

```bash
npm --prefix common run build
npm --prefix common run typecheck
npm --prefix common run test:ci
```

The build generates JavaScript and declarations in `build/`; do not edit generated output manually. `test:ci` rebuilds first. Vitest contracts live in [test](test). Consumers need common built before their typechecks/tests; root install/update commands enforce that ordering and refresh local dependency metadata.

## Real Broker Verification

The separate [broker suite](test/broker/jetstream.test.cjs) requires a dedicated disposable JetStream broker, never the running application's broker. Normal unit tests do not require NATS and do not discover this integration suite. From WSL/Linux at the repository root:

```bash
podman run --rm -d --name ticketing-broker-verification -p 127.0.0.1:14222:4222 docker.io/library/nats:2.12-alpine --jetstream --store_dir /data
NATS_TEST_URL=nats://127.0.0.1:14222 npm --prefix common run test:broker
podman stop ticketing-broker-verification
```

Docker users can substitute `docker` for `podman`. Stop the temporary container even when a test fails. The suite checks file-backed replay, independent groups, durable resume after reconnect and automatic redelivery after missing acknowledgement. CI runs it in a separate broker job. It does not claim an exactly-once guarantee or certify broker-host disaster recovery.

The [root watch launcher](../README.md#infrastructure-containers-and-local-watch) recompiles common and restarts dependent backends. [Dockerfile](Dockerfile) compiles common in its `common` stage and copies the build into the `service` target selected by `SERVICE`, which runs as the `node` user with `NODE_ENV=production`; Compose uses that target for every backend.
