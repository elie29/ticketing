# Production Compose with HTTP nginx

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 0 — 2026-10-20 · 6badd69 — Spec and security review
- [x] Task 1 — 2026-10-20 · 50cf5ae — nginx configuration
- [x] Task 2 — 2026-10-20 · 50cf5ae — Client production image
- [x] Task 3 — 2026-10-20 · 50cf5ae — Backend image hardening
- [x] Task 4 — 2026-10-20 · 50cf5ae — Compose split (prod file + dev overlay)
- [x] Task 5 — 2026-10-20 · 50cf5ae — Scripts and tests
- [x] Task 6 — 2026-10-20 · 50cf5ae — CI acceptance job
- [x] Task 7 — 2026-10-20 · 50cf5ae — Documentation
- [x] Task 8 — 2026-10-20 — End-to-end verification and local commit
- [x] Task 9 — 2026-10-20 · 50cf5ae — Admin UIs in infra mode (mongo-express + Redis Insight)
- [x] Task 10 — 2026-10-20 · 50cf5ae — Drop mongo-express, pin Redis to `7-alpine`
- [x] Task 11 — 2026-10-20 · 50cf5ae — Pin MongoDB to `9.0`

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
- **Secrets**: root `.env.example` committed (`JWT_KEY`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `HTTP_PORT`, `ORDER_EXPIRATION_SECONDS`). Prod file requires `JWT_KEY` and `MONGO_ROOT_PASSWORD` with `${VAR:?message}` (no more `local-development-only-change-me` / `local-dev-password` defaults). `.env.example` leaves `JWT_KEY`, `MONGO_ROOT_PASSWORD` and `MONGO_EXPRESS_PASSWORD` empty so `:?` still fails after a plain `cp`; README documents `openssl rand -base64 48`. Add `.env` to root `.gitignore`. Redis/NATS auth stays out of scope (internal network in prod, `127.0.0.1` in infra mode); noted in README as a limit.

### Dev overlay (`docker-compose.dev.yaml`)

Adds only what `npm run dev` needs: published ports for mongo (27017), redis (6379), nats (4222, 8222), each bound as `127.0.0.1:<port>:<port>`. Also defines the `mongo-express` service on `127.0.0.1:18081:8081` (no profile since Task 9, removed in Task 10 in favour of MongoDB Compass; Redis Insight on `127.0.0.1:15540:5540` added in Task 9), with a pinned image tag, `ME_CONFIG_BASICAUTH_ENABLED: "true"` and `ME_CONFIG_BASICAUTH: "true"`, and its login from `${MONGO_EXPRESS_USERNAME:?}` / `${MONGO_EXPRESS_PASSWORD:?}` (no committed `admin`/`local-dev-password`). Never auto-loaded by plain `docker compose up`.

### Scripts (`scripts/compose.cjs`)

| npm script | runs |
| --- | --- |
| `compose:up` | `docker compose up --build -d` (prod stack) |
| `compose:infra` | `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d mongo redis nats` plus `redisinsight` since Task 9 (after stopping the app containers and nginx) |
| `compose:acceptance` | prod stack with `ORDER_EXPIRATION_SECONDS=15`, unchanged otherwise |
| `compose:down` | `-f docker-compose.yaml -f docker-compose.dev.yaml down` |

Engine selection logic untouched.

### Acceptance and CI

- `test/acceptance/ticketing.test.cjs`: default `ACCEPTANCE_BASE_URL` becomes `http://localhost` (nginx), overridable.
- `.github/workflows/tests.yml` acceptance job: add `JWT_KEY` and `MONGO_ROOT_PASSWORD` env (CI-only throwaway values), keep `docker compose up --build -d`. The acceptance now exercises the real prod path through nginx.

## Task 0 — Spec and security review

- [x] 2026-10-20 · 56a995d — Write `docs/superpowers/specs/2026-10-20-prod-compose-nginx-design.md` from the Design section above.
- [x] 2026-10-20 · 6badd69 — Run the `security-review` skill on the spec. No finding reached confidence 8/10 (3 candidates, all dropped as pre-existing exposure that the design reduces, or speculative); three hardening notes H1-H3 remain for the owner (see Blockers).
- [x] 2026-10-20 · 6badd69 — Fold the hardening notes the owner accepts (H1, H2, H3: all accepted) into the spec and into this plan's Design section.
- [x] 2026-10-20 · 6badd69 — Add one Decision line to `2026-10-20-production-jetstream.md` stating Tasks 3-4 are superseded by this plan.

## Task 1 — nginx configuration

- [x] 2026-10-20 · 50cf5ae — Create `deploy/nginx/default.conf` with the four locations above (prefixes `/api/users/`, `/api/tickets`, `/api/orders`, `/`; nginx default timeouts and buffers kept).
- [x] 2026-10-20 · 50cf5ae — Verify with `nginx -t` (run in `nginx:1.27-alpine` with the four upstream hosts mapped by `--add-host`): syntax ok.

## Task 2 — Client production image

- [x] 2026-10-20 · 50cf5ae — Rewrite `client/Dockerfile` as multi-stage, non-root, `next build` + `next start`.
- [x] 2026-10-20 · 50cf5ae — Extend `client/.dockerignore` (`coverage`, `test`).
- [x] 2026-10-20 · 50cf5ae — Verify: `docker build client` succeeds; the container runs as `node` and `next start` serves the page and `/_next/static` (200). `/` alone answers 404 because SSR fetches `/api/tickets` with no backend; the 200 on `/` is checked through nginx in Task 8.

## Task 3 — Backend image hardening

- [x] 2026-10-20 · 50cf5ae — `common/Dockerfile` `service` stage: `ENV NODE_ENV=production`, `USER node` after `npm ci`.
- [x] 2026-10-20 · 50cf5ae — Verify `docker compose build auth` and that the container starts: healthy, runs as uid 1000 `node`, connected to Mongo.

## Task 4 — Compose split

- [x] 2026-10-20 · 50cf5ae — Rewrite `docker-compose.yaml`: add `nginx`, drop `common` service + `common-build` volume + all host ports except nginx, require secrets, client env and healthcheck.
- [x] 2026-10-20 · 50cf5ae — Create `docker-compose.dev.yaml` (infra ports on `127.0.0.1`, mongo-express under `tools` profile with explicit basic auth, `.env` login and pinned tag).
- [x] 2026-10-20 · 50cf5ae — Add `.env.example` with empty secret values; add `.env` to root `.gitignore`.
- [x] 2026-10-20 · 50cf5ae — Verify: `docker compose config` and `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml config` both valid; without secrets both fail on `JWT_KEY` and `MONGO_ROOT_PASSWORD`; only nginx binds all interfaces, every overlay port binds `127.0.0.1`.

## Task 5 — Scripts and tests

- [x] 2026-10-20 · 50cf5ae — TDD: update `test/compose.test.cjs` expectations first (red: infra/down lacked the overlay), then `scripts/compose.cjs` per the table (green).
- [x] 2026-10-20 · 50cf5ae — Update the acceptance default URL in `test/acceptance/ticketing.test.cjs`.
- [x] 2026-10-20 · 50cf5ae — Run `npm run test:manifests` (it runs `test/compose.test.cjs` too; no `test:compose` script exists): 7/7 pass.

## Task 6 — CI acceptance job

- [x] 2026-10-20 · 50cf5ae — Add `JWT_KEY` and `MONGO_ROOT_PASSWORD` env to the acceptance job in `.github/workflows/tests.yml`.
- [x] 2026-10-20 · 50cf5ae — Add `deploy/**` and `docker-compose.dev.yaml` to the workflow path triggers if paths are filtered.

## Task 7 — Documentation

- [x] 2026-10-20 · 50cf5ae — Root `README.md`: replace "development-only" statements, document `cp .env.example .env`, `docker compose up --build -d`, URL `http://localhost`, infra mode, security limits (HTTP only, no Redis/NATS auth).
- [x] 2026-10-20 · 50cf5ae — Align `scripts/README.md`, `client/README.md`, `common/README.md`, `auth/README.md` matching lines (also the same development-only lines in `tickets`, `orders` and `expiration` READMEs; root architecture text and diagram now show nginx).
- [x] 2026-10-20 · 50cf5ae — `scripts/dev.sh` loads the root `.env` without overriding exported variables (owner decision, see Decisions); checked in a scratch copy: `.env` values with `=` load, empty values fall back to defaults, shell exports win, missing `.env` keeps defaults.
- [x] 2026-10-20 · 50cf5ae — Per-service `.env` cleanup (owner request): `auth/.env` and `tickets/.env` untracked and pointed at `127.0.0.1` instead of the public IP `REDACTED_IP`, then removed with their templates since no workflow needs them (`npm run dev`, Compose and the test suites all supply the variables); `orders/.env` and `expiration/.env` deleted (no dotenv in those services); auth, tickets and root READMEs updated. Auth (12) and tickets (23) suites pass without them.

## Task 8 — End-to-end verification and local commit

- [x] 2026-10-20 · 50cf5ae — `cp .env.example .env` with test values; `docker compose up --build -d`; all services reach `healthy` (`docker compose ps`).
- [x] 2026-10-20 · 50cf5ae — `curl -i http://localhost/` returns the Next page; `curl -i http://localhost/api/users/currentuser` returns 401 `Not authorized` from auth through nginx.
- [x] 2026-10-20 · 50cf5ae — `npm run test:acceptance` passes against `http://localhost` (6 scenarios, including cookie session and expiration with `compose:acceptance`): 6/6 pass with `ORDER_EXPIRATION_SECONDS=15` exported (a plain `docker compose up` after `compose:acceptance` recreates orders with the `.env` value).
- [x] 2026-10-20 · 50cf5ae — Only nginx has a published port (`docker compose ps`); `docker port <mongo container>` is empty.
- [x] 2026-10-20 · 50cf5ae — `npm run compose:infra` then `npm run dev`: app works on `http://localhost:3000` with the dev rewrites, Mongo reachable on `127.0.0.1:27017`; `docker compose ps` shows every infra port bound to `127.0.0.1` only. Passed: services authenticate to Mongo with the root `.env` password; `/` and `/api/tickets` return 200 on :3000.
- [x] 2026-10-20 · 50cf5ae — mongo-express via `--profile tools`: `curl -i http://127.0.0.1:18081` returns 401 without credentials and 200 with the `.env` login (401 with the old `admin`/`local-dev-password`).
- [x] 2026-10-20 · 50cf5ae — `docker compose up` without `.env`, and again right after `cp .env.example .env`, fails fast with the `JWT_KEY` required message.
- [x] 2026-10-20 · 50cf5ae — `npm test` (root gate) passes; `npm --prefix client run build` still passes (96 tests in 7 suites, client compiled).
- [x] 2026-10-20 — Browser check of the running prod stack (signup, create ticket, order): passed (owner). The accessibility pass and the Redis Insight EULA check move to Task 5 of `2026-10-20-client-vite-spa.md`, since that plan replaces the client being checked.
- [x] 2026-10-20 — Local commit. No push.

## Task 9 — Admin UIs in infra mode

- [x] 2026-10-20 · 50cf5ae — TDD: `test/compose.test.cjs` expects `infra` to stop only the app containers and nginx, then start `mongo redis nats mongo-express redisinsight`; `down` drops `--profile tools`. Red, then green (7/7).
- [x] 2026-10-20 · 50cf5ae — `docker-compose.dev.yaml`: remove the `tools` profile from mongo-express; add `redisinsight` (pinned `redis/redisinsight:2.70.0` tag, `127.0.0.1:15540:5540`, preconfigured connection to `redis:6379`, `depends_on` redis healthy).
- [x] 2026-10-20 · 50cf5ae — `scripts/compose.cjs` per the test; `npm run test:manifests` green.
- [x] 2026-10-20 · 50cf5ae — Docs: root README infra section and ports, `scripts/README.md`, spec `docs/superpowers/specs/2026-10-20-prod-compose-nginx-design.md` and this plan's Design section (mongo-express no longer opt-in; Redis Insight has no login, local-only).
- [x] 2026-10-20 · 50cf5ae — Verify: `npm run compose:infra` starts all five; mongo-express 401/200 as before; `curl http://127.0.0.1:15540/` returns 200; ports bound to `127.0.0.1` only; `compose:down` removes both UIs. Redis Insight adds the preconfigured `ticketing` connection only after its EULA is accepted in the UI (its discovery code checks `agreements.eula`), so the connection list stays empty until the owner accepts it; that check moves to the browser pass.

## Task 10 — Drop mongo-express, pin Redis

- [x] 2026-10-20 · 50cf5ae — TDD: `test/compose.test.cjs` expects `infra` to start `mongo redis nats redisinsight` (no `mongo-express`). Red, then green (7/7).
- [x] 2026-10-20 · 50cf5ae — `docker-compose.dev.yaml`: remove the `mongo-express` service; `scripts/compose.cjs` per the test.
- [x] 2026-10-20 · 50cf5ae — `.env.example` and local `.env`: remove `MONGO_EXPRESS_USERNAME` / `MONGO_EXPRESS_PASSWORD`.
- [x] 2026-10-20 · 50cf5ae — `docker-compose.yaml`: `redis` image `docker.io/library/redis:7-alpine`.
- [x] 2026-10-20 · 50cf5ae — Docs: root README (infra, ports, Compass connection string), `scripts/README.md`, spec, this plan's Design section.
- [x] 2026-10-20 · 50cf5ae — Verify: `npm run test:manifests`; both Compose configs valid; `compose:infra` runs redis 7 and Redis Insight; prod stack acceptance 6/6 with Redis 7 (expiration uses Bull). Passed: Redis 7.4.8, Redis Insight 200 on `127.0.0.1:15540`, acceptance 6/6.

## Task 11 — Pin MongoDB

- [x] 2026-10-20 · 50cf5ae — `docker-compose.yaml`: `mongo` image `docker.io/library/mongo:9.0` (the unpinned tag resolved to 9.0.4).
- [x] 2026-10-20 · 50cf5ae — Verify: Compose config valid; mongo recreated on `9.0`, healthy; services reconnect; `/api/tickets` 200 through nginx. Passed (MongoDB v9.0.4).

## Out of scope

TLS/domain, Redis/NATS authentication, compiling backend TypeScript to JS, Kubernetes, the remaining tasks of `2026-10-20-production-jetstream.md` (broker replay checks).

## Decisions

- 2026-10-20 — nginx is HTTP-only on port 80 (user choice); no TLS or domain handling.
- 2026-10-20 — Development stays on `npm run dev`; Docker Compose is production only, with an infra-only mode sharing Mongo/Redis/NATS with local dev (user choice).
- 2026-10-20 — This plan replaces Tasks 3-4 of `2026-10-20-production-jetstream.md` (user asked for a fresh plan).
- 2026-10-20 — Infra host ports and mongo-express live in a `docker-compose.dev.yaml` overlay so the prod file publishes nothing but nginx (assistant call; keeps plain `docker compose up` safe on a host).
- 2026-10-20 — Backend images keep `tsx` at runtime instead of a `tsc` build step (assistant call; avoids touching four tsconfigs and the manifest test for no functional gain).
- 2026-10-20 — `JWT_KEY` and `MONGO_ROOT_PASSWORD` become required via `.env.example` (assistant call; removes committed default secrets from the prod path).
- 2026-10-20 — Owner accepted hardening notes H1-H3: infra-mode ports on `127.0.0.1`; mongo-express opt-in under `tools` with explicit basic auth, `.env` login and pinned tag; secrets empty in `.env.example`.
- 2026-10-20 — mongo-express login variables are named `MONGO_EXPRESS_USERNAME` / `MONGO_EXPRESS_PASSWORD` and are required in the overlay (assistant call; infra mode already needs `.env` because the base file requires `JWT_KEY`).
- 2026-10-20 — Security review of the spec (Task 0): no blocking finding; the design reduces exposure compared with today's Compose file, which already publishes Mongo/Redis/NATS/mongo-express on every interface. Hardening notes H1-H3 are proposals only and wait for the owner's decision (reason: not requested, so they are not adopted without approval).
- 2026-10-20 — nginx keeps its default timeouts, buffer sizes and `client_max_body_size` (assistant call; the spec leaves these values open, so none are invented).
- 2026-10-20 — Client image copies no `public/` directory (assistant call; `client/public` does not exist, so the spec's copy step has nothing to copy).
- 2026-10-20 — Task 8 expects 401 `Not authorized` on anonymous `GET /api/users/currentuser`, not `{"currentUser":null}` (the route chains `requireAuth`; the plan was wrong, the code is unchanged).
- 2026-10-20 — Client healthcheck succeeds on any HTTP answer from `GET /`, not `< 500` like the APIs (assistant call; `/` returns 503 while nginx is down, and nginx waits for the client to be healthy, so `< 500` would deadlock the stack).
- 2026-10-20 — mongo-express pinned to `docker.io/library/mongo-express:1.0.2` (assistant call; latest stable tag, checked with `docker manifest inspect`).
- 2026-10-20 — `.env.example` pre-fills the non-secret values (`MONGO_ROOT_USERNAME=root`, `MONGO_EXPRESS_USERNAME=admin`, `HTTP_PORT=80`, `ORDER_EXPIRATION_SECONDS=900`) and leaves `JWT_KEY`, `MONGO_ROOT_PASSWORD` and `MONGO_EXPRESS_PASSWORD` empty (assistant call, per H3).
- 2026-10-20 — `compose:infra` stops `nginx` as well and no longer names the removed `common` service; `infra` and `down` pass both Compose files so mongo-express and the `127.0.0.1` ports come from the overlay (assistant call, follows the Task 4 split).
- 2026-10-20 — `scripts/dev.sh` loads the root `.env` so `npm run dev` uses the same Mongo credentials as infra mode; variables already exported in the shell keep priority (owner choice, over documenting a manual export step).
- 2026-10-20 — Per-service `.env` files are git-ignored; only `.env.example` templates are committed. No per-service `.env` or `.env.example` remains: none is needed by `npm run dev`, Compose or the tests (owner request); the root `.env.example` is the only template. The public IP and old passwords remain in git history.
- 2026-10-20 — `compose:infra` starts mongo-express and Redis Insight with mongo, redis and nats; the `tools` profile is removed (owner choice; replaces the opt-in part of H2, mongo-express basic auth and `127.0.0.1` binding kept).
- 2026-10-20 — Redis Insight is added to the dev overlay on `127.0.0.1:15540` (owner choice; mirrors the 18081-for-8081 mapping). Its free edition has no login, accepted because it binds to loopback only and Redis itself has no auth in infra mode.
- 2026-10-20 — Redis Insight's EULA is not accepted through its API on the owner's behalf (assistant call; it is a licence acceptance the owner makes in the UI).
- 2026-10-20 — `client/AGENTS.md` (generated by `next dev`, never committed) deleted at the owner's request.
- 2026-10-20 — Owner wants Next.js removed from the client (Vite + React + React Router static build served by nginx was proposed). It is a separate feature: brainstorm, spec, security review and its own plan; dropping the `next` dependency belongs to that plan, not to this one.
- 2026-10-20 — Next.js removal brainstorm: owner's why is "keep the client simple"; owner indifferent on page test coverage, so the assistant chose API-level acceptance plus app-shell checks for page URLs (no browser test runner). Draft spec `docs/superpowers/specs/2026-10-20-client-vite-spa-design.md` (uncommitted) is under the builder check, then goes to the owner for approval.
- 2026-10-20 — mongo-express removed from the dev overlay; MongoDB Compass on the host connects to `127.0.0.1:27017` instead (owner choice: weaker, slowly maintained UI with a security history; Compass already installed).
- 2026-10-20 — Redis pinned to `docker.io/library/redis:7-alpine` (owner choice; it was unpinned).
- 2026-10-20 — Redis Insight image tag is `redis/redisinsight:2.70` (owner edit in the IDE, replacing `2.70.0`; kept).
- 2026-10-20 — MongoDB pinned to `docker.io/library/mongo:9.0` (owner asked to pin; assistant chose the minor line of the version already running, 9.0.4, so patches arrive but no major jump). The owner asked for alpine: no official `mongo` alpine tag exists (`9.0-alpine`, `9-alpine`, `alpine` all missing; MongoDB does not support musl), and unofficial builds are not adopted, so `9.0` stays.
- 2026-10-20 — Plan closed after the owner's browser check passed; the accessibility pass and Redis Insight EULA check are carried into `2026-10-20-client-vite-spa.md` Task 5 (assistant call; the Next client they would check is being replaced).
- 2026-10-20 — History rewritten by the owner (squash into `50cf5ae`); commit references updated to `50cf5ae`, which now holds the work of `08063f9`, `0966335`, `342ad8d`, `376f471`, `3973b01`, `4c74f51`, `8914794`, `a5081d6`, `a93481e`, `e737478`, `f060287`.

## Blockers

None.
