# Backend Folder Implementation Plan

> **Status:** in progress
>
> **Resume at:** Task 3 — run `CI=1 npm test` alone, then broker suite, then Compose config and image build
>
> **Last updated:** 2026-10-21 · uncommitted

## Tasks

- [x] Task 1 — Move the five backend packages into `backend/` and repoint every outside reference — 2026-10-21 · uncommitted
- [x] Task 2 — Docs follow the move — 2026-10-21 · uncommitted
- [ ] Task 3 — Full regression gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `auth`, `tickets`, `orders`, `expiration` and `common` live under `backend/`; every existing command works unchanged.

**Architecture:** Pure `git mv` plus path updates outside the packages. `common` stays a sibling of the services, so in-package relative paths (`file:../common`, `../common/build`, lockfile `../common`) are untouched.

**Tech Stack:** Node 24, Vitest 5, Docker/Podman Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-21-backend-folder-design.md`

## Global Constraints

- No change inside any package except the `--config ../../vitest.config.mts` test scripts.
- npm script names, Compose service names, ports, images and image-internal paths unchanged.
- Historical `docs/superpowers/` plans/specs keep old paths.
- `.gitattributes` working-tree edit stays out of this change's commits.
- Never `git push`.

## Review Focus

- `npm run dev` from the root: `--prefix backend/<name>` for the five packages, `client` unchanged.
- Compose builds: `dockerfile: backend/common/Dockerfile` with context `.`; COPY sources `backend/common/...`, `backend/${SERVICE}/...`.
- CI cache-dependency-path and path filters must name `backend/...` or caching/triggers silently break.
- Leftover old-path references: grep for `--prefix (auth|tickets|orders|expiration|common)`, `(^|[ '"/])(auth|tickets|orders|expiration|common)/(package|src|test|Dockerfile|README)` outside `backend/` and `docs/superpowers/`.

---

### Task 1: Move and repoint

**Files:**

- Move: `auth`, `tickets`, `orders`, `expiration`, `common` → `backend/`
- Modify: `test/package-manifests.test.cjs`, `vitest.config.mts`, `backend/*/package.json` (test scripts), `backend/common/Dockerfile`, `docker-compose.yaml`, `scripts/install.sh`, `scripts/update.sh`, `scripts/test.sh`, `scripts/dev.sh`, `.github/workflows/tests.yml`

- [x] 2026-10-21 · uncommitted — Step 1: In `test/package-manifests.test.cjs`, directories become `backend/common`, `backend/auth`, … and expected scripts `vitest run --config ../../vitest.config.mts --project <name>`; `npm run test:manifests` — failed as expected (ENOENT `backend/common/package.json`).
- [x] 2026-10-21 · uncommitted — Step 2: `git mv` the five packages (installed `node_modules` moved with them); every listed file updated; `npm run test:manifests` passes.

### Task 2: Docs

**Files:** `README.md`, `scripts/README.md`, `test/README.md`, `client/README.md`, `backend/*/README.md`

- [x] 2026-10-21 · uncommitted — Step 1: Root, test and five package READMEs updated (paths, `--prefix backend/<name>`, root links gain `../`; added a layout sentence under Package Documentation); prettier clean. Pre-existing: `scripts/README.md` links `.vscode/tasks.json`, which is not in the repo — left as is.

### Task 3: Gate

- [ ] Step 1: `CI=1 npm test` — manifests 7, common 9, auth 12, tickets 23, orders 26, expiration 4, routing 23, client lint/build.
- [ ] Step 2: Broker suite with disposable NATS — 2 passed.
- [ ] Step 3: `podman compose ... config` renders; backend images build from `backend/common/Dockerfile`.
- [ ] Step 4: Leftover-path grep is empty.

## Decisions

- 2026-10-21 — Five backend packages move into `backend/`; `client/`, `deploy/`, `scripts/`, `test/`, `docs/` stay. Reason: user agreed to the assistant's proposal.
- 2026-10-21 — `common` moves with the services. Reason: assistant's proposal, user agreed; keeps all in-package relative paths valid.
- 2026-10-21 — Execute inline in this session. Reason: user said go.

## Blockers

None.
