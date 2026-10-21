# Acceptance Target Follows HTTP_PORT Design

## Intent

`npm run test:acceptance` failed to connect on 2026-10-21. The root `.env` sets `HTTP_PORT=8080` (as `.env.example` does), so Compose publishes nginx on 8080, while the acceptance suite targets `http://localhost` (port 80) unless `ACCEPTANCE_BASE_URL` is exported. Nothing listens on 80, so every request fails. With `ACCEPTANCE_BASE_URL=http://localhost:8080` all 6 acceptance tests pass. The port is chosen in one place (`HTTP_PORT`) and the suite must follow it.

## Goals

- The acceptance suite resolves its target as: `ACCEPTANCE_BASE_URL`, else `http://localhost:${HTTP_PORT}`, else `http://localhost`. An empty `HTTP_PORT` counts as unset, as Compose's `${HTTP_PORT:-80}` does.
- The root `vitest` launcher action fills `HTTP_PORT` from the root `.env` when the shell has not set it. The shell wins over the file, as in Compose and in `dev`.
- README and test README state the real defaults and the resolution order.

## Non-goals

- No change to Compose, `.env.example`, ports, CI workflow or the acceptance scenarios.
- No change to `dev` or the other launcher actions.

## Anti-goals

- Forwarding the whole `.env` (secrets such as `JWT_KEY`, `MONGO_ROOT_PASSWORD`) into the test process.
- Breaking CI: with no `.env` and no `HTTP_PORT`, the target stays `http://localhost`.

## Design

- **Test** (`test/acceptance/ticketing.test.cjs`): reads only environment variables; owns the URL resolution order.
- **Launcher** (`scripts/actions/vitest.cjs`): owns reading `.env`. It takes `readFile` from the launcher context (dependency inversion, as `dev` already does), parses with the existing `scripts/lib/env-file.cjs`, and passes `env` to `run` with `HTTP_PORT` added only when absent from `process.env` and present in the file. Without a `.env` value it passes the environment unchanged. A repeated `HTTP_PORT` in the file keeps its first value, as `dev` does.
- Running Vitest directly with `HTTP_PORT` exported works too, since the test only reads the environment.

## Docs

- `README.md`: the Ports section says Compose defaults `HTTP_PORT` to 80 and `.env.example` sets 8080; the acceptance paragraph gives the resolution order.
- `test/README.md`: the same order in one sentence.

## Verification

- New launcher tests in `test/launchers.test.cjs`, written first and seen failing: `.env` port forwarded; shell value wins; no `.env` value adds nothing.
- `npm test` passes; `npm run test:acceptance` passes against the running 8080 stack without `ACCEPTANCE_BASE_URL`.
