# Production Compose with HTTP nginx — design

Date: 2026-10-20. Implementation plan: [../plans/2026-10-20-prod-compose-nginx.md](../plans/2026-10-20-prod-compose-nginx.md).

## Intent

Give the project a production launch path with a single command, `docker compose up --build -d`, fronted by an nginx reverse proxy on plain HTTP, while keeping `npm run dev` as the development workflow. Both share the same Mongo, Redis and NATS containers.

## Goals

- One public entry point: nginx on port 80 (configurable), routing `/api/users/*`, `/api/tickets*` and `/api/orders*` to the services and everything else to the Next.js production server.
- The client runs `next build` once at image build time and serves with `next start`, as a non-root user.
- Backend images run as a non-root user with `NODE_ENV=production`; the `common` library is compiled into the image, with no shared build volume.
- No database, broker or service port is published by the production file.
- Production secrets (`JWT_KEY`, `MONGO_ROOT_PASSWORD`) are required and supplied through a `.env` file; a committed `.env.example` lists them with empty values, so `${VAR:?}` still fails right after `cp .env.example .env` until real values are generated (e.g. `openssl rand -base64 48`).
- `npm run compose:infra` starts only Mongo, Redis and NATS, with host ports bound to `127.0.0.1`, for `npm run dev`. mongo-express stays opt-in through the `tools` profile, also bound to `127.0.0.1`.
- The acceptance suite and the CI acceptance job run against the production stack through nginx.

## Non-goals

- TLS, certificates or a public domain.
- Redis or NATS authentication (they stay on the internal Compose network in production, and on `127.0.0.1` in infra mode).
- Compiling backend TypeScript to JavaScript; `tsx` remains the runtime.
- Kubernetes, Skaffold or any other orchestrator.

## Anti-goals

- Breaking `npm run dev`, `scripts/dev.sh` or the Next rewrites used in development.
- A production file that silently falls back to committed default passwords.
- Host ports for Mongo, Redis or NATS appearing in the production file.
- Any infra-mode port published on an interface other than `127.0.0.1`.
- mongo-express reachable with a committed login.

## Constraints

- Cookie sessions are `secure: false` in auth, tickets and orders; this is what makes HTTP-only login work and must not change.
- `client/next.config.js` reads `AUTH_API_URL`, `ORDERS_API_URL` and `TICKETS_API_URL` at build time; the production image is built without them so no rewrites are baked in, and nginx owns API routing. Server-side rendering uses `API_BASE_URL=http://nginx`.
- `test/package-manifests.test.cjs` asserts the exact backend `start` scripts; they stay `tsx src/index.ts`.
- Compose engine selection in `scripts/compose.cjs` (COMPOSE_BIN, Docker, WSL Podman) is unchanged.

## Decided shape

Files:

- `docker-compose.yaml` — production stack: nginx, client, auth, tickets, orders, expiration, mongo, redis, nats. Only nginx has `ports`.
- `docker-compose.dev.yaml` — overlay adding host ports for mongo (27017), redis (6379), nats (4222, 8222), all as `127.0.0.1:<port>:<port>`, and the mongo-express service under `profiles: [tools]` on `127.0.0.1:18081:8081`. mongo-express has basic auth enabled explicitly (`ME_CONFIG_BASICAUTH_ENABLED` and `ME_CONFIG_BASICAUTH` set to `"true"`), takes its login from required `MONGO_EXPRESS_USERNAME` / `MONGO_EXPRESS_PASSWORD`, and uses a pinned image tag. Loaded only by `compose:infra` and `compose:down`.
- `deploy/nginx/default.conf` — the four `location` blocks, forwarding `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- `client/Dockerfile` — multi-stage: deps, build, run (`USER node`, `npm start`).
- `common/Dockerfile` — `service` stage gains `ENV NODE_ENV=production` and `USER node`.
- `.env.example` — `JWT_KEY`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `HTTP_PORT`, `ORDER_EXPIRATION_SECONDS`, `MONGO_EXPRESS_USERNAME`, `MONGO_EXPRESS_PASSWORD`. Secret values (`JWT_KEY`, `MONGO_ROOT_PASSWORD`, `MONGO_EXPRESS_PASSWORD`) are empty. Root `.env` is git-ignored.

Health: client gets a node one-liner healthcheck on `GET /`; nginx depends on client, auth, tickets and orders being healthy. Existing checks for the services, mongo, redis and nats are kept.

Acceptance: `ACCEPTANCE_BASE_URL` defaults to `http://localhost`. CI's acceptance job sets throwaway `JWT_KEY` and `MONGO_ROOT_PASSWORD` values.

## Security review

The `security-review` skill ran on this spec on 2026-10-20. No finding reached confidence 8/10: today's Compose file already publishes Mongo, Redis, NATS and mongo-express on every interface, and this design reduces that exposure. Three hardening notes were accepted by the owner and are folded in above: infra-mode ports bound to `127.0.0.1`; mongo-express opt-in with explicit basic auth and a login from `.env`; secrets left empty in `.env.example`.

## Left to the builder

- Exact nginx timeouts, buffer sizes and the `client_max_body_size` value.
- The pinned mongo-express image tag.
- Whether the Next image copies `public/` explicitly or relies on the build context.
- The wording of the README sections and the security-limits paragraph.
