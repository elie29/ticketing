# Backend Folder Reorganisation Design

## Intent

The repository root mixes the five backend packages (`auth`, `tickets`, `orders`, `expiration`, `common`) with the client, deployment files, scripts, root tests and docs. The user wants a tidier root that mirrors the architecture: one `backend/` folder beside `client/`. This was deferred from the single-Vitest-config change on 2026-10-21 and is now its own change.

## Target layout

```
backend/
  auth/  tickets/  orders/  expiration/  common/
client/
deploy/  docs/  scripts/  test/
docker-compose.yaml  docker-compose.dev.yaml  vitest.config.mts  package.json  package-lock.json  .env(.example)
```

## Goals

- Move `auth`, `tickets`, `orders`, `expiration` and `common` into `backend/` with `git mv`, preserving history.
- Everything that names those folders from outside follows the move, so every existing command keeps working with the same name: `npm run install|update|dev|test|test:all|test:manifests|test:services|test:routing|test:acceptance|compose:*`.
- Each backend still runs its own tests from its own folder (`npm --prefix backend/<name> run test`), as decided for the Vitest change.
- CI keeps the same jobs and behaviour with the new paths.

## Non-goals

- No change inside any package: source, tests, `tsconfig.json`, package names, dependencies, versions and lockfile contents stay as they are. `common` stays a sibling of the services, so `file:../common`, the `tsx watch --include "../common/build/**/*.js"` dev scripts and the four lockfiles' `../common` entries remain valid unchanged.
- `client/`, `deploy/`, `scripts/`, root `test/` and `docs/` stay where they are.
- No change to Compose service names, ports, images, networks, volumes or environment; no change to the image layout (`/app/common` and `/app/<service>` remain siblings inside the image).
- No rename of npm scripts.

## Anti-goals

- A broken `npm run dev`, Compose build or CI job after the move.
- Weakened, skipped or lost tests; the suite counts must match before and after.
- Rewriting historical plans/specs in `docs/superpowers/` to pretend the old layout never existed.

## What changes (outside the packages)

- `common/Dockerfile` → `backend/common/Dockerfile`; its `COPY` sources become `backend/common/...` and `backend/${SERVICE}/...`. Image-internal paths unchanged.
- `docker-compose.yaml`: the four backend `dockerfile:` entries → `backend/common/Dockerfile` (build context stays `.`).
- Per-package `.dockerignore` files move with their packages; the root `.dockerignore` (`**/` patterns) needs no change.
- `vitest.config.mts`: project folders become `backend/<name>` (`common` and `common-broker` → `backend/common`); `root` and `client` unchanged.
- Backend and common `package.json` test scripts: `--config ../vitest.config.mts` → `--config ../../vitest.config.mts`.
- `scripts/install.sh`, `scripts/update.sh`, `scripts/test.sh`, `scripts/dev.sh`: `--prefix` paths for the five packages become `backend/<name>`; `client` unchanged.
- `test/package-manifests.test.cjs`: package directories and expected script strings use the new paths.
- `.github/workflows/tests.yml`: path filters (`backend/**` replaces the five package entries), `cache-dependency-path`, and every `npm --prefix` for backend packages.
- Docs: root `README.md`, `scripts/README.md`, `test/README.md`, `client/README.md` and the five package READMEs — links and commands that name the old paths. Package READMEs' relative links to root files gain one `../`.

## Verification

- `npm test` (manifests, common, four backends with typechecks, client lint/build, routing) passes with the same counts as before the move: manifests 7, common 9, auth 12, tickets 23, orders 26, expiration 4, routing 23.
- The common broker suite passes against a disposable NATS (2 tests).
- `podman compose -f docker-compose.yaml -f docker-compose.dev.yaml config` renders, and the four backend images build from the new Dockerfile path.
- No remaining references to the old top-level package paths outside `docs/superpowers/` history (grep).

## Left to the builder

- Order of edits and how to batch commits.
- Whether local `node_modules` must be reinstalled after the move. The `../common` symlinks are relative and should survive; reinstall if anything fails to resolve.

## Constraints

- Node 24, Vitest 5, existing WSL-based root launchers on Windows.
- Never `git push` (user rule).
- No distributed-transaction or behaviour changes; this is a pure file move plus path updates.
