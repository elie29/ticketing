# Production Compose with HTTP nginx

> **Status:** in progress
>
> **Resume at:** Task 0 — run the security-review skill on docs/superpowers/specs/2026-10-20-prod-compose-nginx-design.md (spec already written)
>
> **Last updated:** 2026-10-20 · uncommitted

## Tasks

- [ ] Task 0 — Spec and security review
- [ ] Task 1 — nginx configuration
- [ ] Task 2 — Client production image
- [ ] Task 3 — Backend image hardening
- [ ] Task 4 — Compose split (prod file + dev overlay)
- [ ] Task 5 — Scripts and tests
- [ ] Task 6 — CI acceptance job
- [ ] Task 7 — Documentation
- [ ] Task 8 — End-to-end verification and local commit

## Context

Today `docker-compose.yaml` is a development stack: the client container runs `next dev`, a one-shot `common` container fills a shared build volume, every port (3000-3003, 27017, 4222, 8222, 6379) is published on the host, and there is no reverse proxy. The README states that no production Compose exists.

Target:

- **`npm run dev`** remains the development path (Next dev server + `tsx watch` services on localhost, pointing at containerised Mongo/Redis/NATS).
- **`docker compose up --build -d`** becomes the production stack: an **HTTP-only nginx on port 80** routes `/api/*` to the services and everything else to a Next production server. No TLS, no domain.
- **Infra is shared**: the same Compose file provides Mongo/Redis/NATS to `npm run dev` through an infra-only mode.
- The production tasks (3 and 4) of `2026-10-20-production-jetstream.md` are superseded by this plan.

## Design

### Topology (prod, `docker-compose.yaml`)

```text
host:80 -> nginx -> /api/users/*   -> auth:3001
                 -> /api/tickets*  -> tickets:3003
                 -> /api/orders*   -> orders:3002
                 -> /*             -> client:3000 (next start)
expiration, mongo, redis, nats: internal network only, no published ports
```

- **nginx** (`docker.io/library/nginx:1.27-alpine`), config in `deploy/nginx/default.conf` mounted read-only. `proxy_set_header Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, `proxy_http_version 1.1`. Published port `${HTTP_PORT:-80}:80`. It is the only service with `ports:` in the prod file. `depends_on` client, auth, tickets, orders healthy.
- **client**: new multi-stage `client/Dockerfile`: `deps` (npm ci) -> `build` (`next build`) -> `run` (`npm ci --omit=dev`, copy `.next` + `public`, `USER node`, `CMD npm start`). `NODE_ENV=production`. Env `API_BASE_URL=http://nginx` so SSR requests take the same nginx route as the browser. `AUTH_API_URL`, `ORDERS_API_URL`, `TICKETS_API_URL` are **not** set at build time, so `client/next.config.js` emits no rewrites in the prod image; nginx owns API routing. Dev (`scripts/dev.sh`) keeps using the rewrites. Healthcheck: node one-liner GET `http://127.0.0.1:3000/` (same style as `x-api-healthcheck`).
- **auth / tickets / orders / expiration**: keep `common/Dockerfile` `service` target (it already compiles `common` and installs prod deps; `tsx` is a runtime dependency, so `npm start` is production-capable). Changes: add `USER node` and `ENV NODE_ENV=production`; remove the `common-build` volume mount and the one-shot `common` service from Compose (the image already contains `common/build`). Backend `start` scripts and `test/package-manifests.test.cjs` stay untouched.
- **Cookies**: `secure: false` is hardcoded in the three `app.ts`, so HTTP login works. No change.
- **Secrets**: root `.env.example` committed (`JWT_KEY`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `HTTP_PORT`, `ORDER_EXPIRATION_SECONDS`). Prod file requires `JWT_KEY` and `MONGO_ROOT_PASSWORD` with `${VAR:?message}` (no more `local-development-only-change-me` / `local-dev-password` defaults). Add `.env` to root `.gitignore`. Redis/NATS auth stays out of scope (not published, internal network only); noted in README as a limit.

### Dev overlay (`docker-compose.dev.yaml`)

Adds only what `npm run dev` needs: published ports for mongo (27017), redis (6379), nats (4222, 8222), plus the `mongo-express` service (18081). Never auto-loaded by plain `docker compose up`.

### Scripts (`scripts/compose.cjs`)

| npm script | runs |
| --- | --- |
| `compose:up` | `docker compose up --build -d` (prod stack) |
| `compose:infra` | `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d mongo redis nats mongo-express` (after stopping app containers, as today) |
| `compose:acceptance` | prod stack with `ORDER_EXPIRATION_SECONDS=15`, unchanged otherwise |
| `compose:down` | `-f docker-compose.yaml -f docker-compose.dev.yaml down` (drops `--profile tools`) |

Engine selection logic untouched.

### Acceptance and CI

- `test/acceptance/ticketing.test.cjs`: default `ACCEPTANCE_BASE_URL` becomes `http://localhost` (nginx), overridable.
- `.github/workflows/tests.yml` acceptance job: add `JWT_KEY` and `MONGO_ROOT_PASSWORD` env (CI-only throwaway values), keep `docker compose up --build -d`. The acceptance now exercises the real prod path through nginx.

## Task 0 — Spec and security review

- [x] 2026-10-20 · uncommitted — Write `docs/superpowers/specs/2026-10-20-prod-compose-nginx-design.md` from the Design section above.
- [ ] Run the `security-review` skill on the spec; fold findings into the spec and into this plan.
- [ ] Add one Decision line to `2026-10-20-production-jetstream.md` stating Tasks 3-4 are superseded by this plan.

## Task 1 — nginx configuration

- [ ] Create `deploy/nginx/default.conf` with the four locations above.
- [ ] Verify with `docker compose run --rm nginx nginx -t` once the service exists (Task 4).

## Task 2 — Client production image

- [ ] Rewrite `client/Dockerfile` as multi-stage, non-root, `next build` + `next start`.
- [ ] Extend `client/.dockerignore` (`coverage`, `test`).
- [ ] Verify: `docker build client` then `docker run -p 3000:3000` returns 200 on `/`.

## Task 3 — Backend image hardening

- [ ] `common/Dockerfile` `service` stage: `ENV NODE_ENV=production`, `USER node` after `npm ci`.
- [ ] Verify `docker compose build auth` and that the container starts.

## Task 4 — Compose split

- [ ] Rewrite `docker-compose.yaml`: add `nginx`, drop `common` service + `common-build` volume + all host ports except nginx, require secrets, client env and healthcheck.
- [ ] Create `docker-compose.dev.yaml` (infra ports + mongo-express).
- [ ] Add `.env.example`; add `.env` to root `.gitignore`.
- [ ] Verify: `docker compose config` and `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml config` both valid.

## Task 5 — Scripts and tests

- [ ] TDD: update `test/compose.test.cjs` expectations first, then `scripts/compose.cjs` per the table.
- [ ] Update the acceptance default URL in `test/acceptance/ticketing.test.cjs`.
- [ ] Run `npm run test:compose` and `npm run test:manifests`.

## Task 6 — CI acceptance job

- [ ] Add `JWT_KEY` and `MONGO_ROOT_PASSWORD` env to the acceptance job in `.github/workflows/tests.yml`.
- [ ] Add `deploy/**` and `docker-compose.dev.yaml` to the workflow path triggers if paths are filtered.

## Task 7 — Documentation

- [ ] Root `README.md`: replace "development-only" statements, document `cp .env.example .env`, `docker compose up --build -d`, URL `http://localhost`, infra mode, security limits (HTTP only, no Redis/NATS auth).
- [ ] Align `scripts/README.md`, `client/README.md`, `common/README.md`, `auth/README.md` matching lines.

## Task 8 — End-to-end verification and local commit

- [ ] `cp .env.example .env` with test values; `docker compose up --build -d`; all services reach `healthy` (`docker compose ps`).
- [ ] `curl -i http://localhost/` returns the Next page; `curl -i http://localhost/api/users/currentuser` returns `{"currentUser":null}` through nginx.
- [ ] `npm run test:acceptance` passes against `http://localhost` (6 scenarios, including cookie session and expiration with `compose:acceptance`).
- [ ] Only nginx has a published port (`docker compose ps`); `docker port <mongo container>` is empty.
- [ ] `npm run compose:infra` then `npm run dev`: app works on `http://localhost:3000` with the dev rewrites, Mongo reachable on 27017, mongo-express on 18081.
- [ ] `docker compose up` without `.env` fails fast with the `JWT_KEY` required message.
- [ ] `npm test` (root gate) passes; `npm --prefix client run build` still passes.
- [ ] Browser check of the running prod stack (signup, create ticket, order), then accessibility pass per the global workflow.
- [ ] Local commit. No push.

## Out of scope

TLS/domain, Redis/NATS authentication, compiling backend TypeScript to JS, Kubernetes, the remaining tasks of `2026-10-20-production-jetstream.md` (broker replay checks).

## Decisions

- 2026-10-20 — nginx is HTTP-only on port 80 (user choice); no TLS or domain handling.
- 2026-10-20 — Development stays on `npm run dev`; Docker Compose is production only, with an infra-only mode sharing Mongo/Redis/NATS with local dev (user choice).
- 2026-10-20 — This plan replaces Tasks 3-4 of `2026-10-20-production-jetstream.md` (user asked for a fresh plan).
- 2026-10-20 — Infra host ports and mongo-express live in a `docker-compose.dev.yaml` overlay so the prod file publishes nothing but nginx (assistant call; keeps plain `docker compose up` safe on a host).
- 2026-10-20 — Backend images keep `tsx` at runtime instead of a `tsc` build step (assistant call; avoids touching four tsconfigs and the manifest test for no functional gain).
- 2026-10-20 — `JWT_KEY` and `MONGO_ROOT_PASSWORD` become required via `.env.example` (assistant call; removes committed default secrets from the prod path).

## Blockers

None.
