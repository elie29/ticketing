# Single Vitest Config Implementation Plan

> **Status:** in progress
>
> **Resume at:** Task 3 — read the rerun of `npm test` (scratchpad npm-test-2.log); first run failed in auth signup because the concurrent broker run rebuilt `common/build` mid-test
>
> **Last updated:** 2026-10-21 · uncommitted

## Tasks

- [x] Task 1 — Root projects config replaces the six package configs — 2026-10-21 · uncommitted
- [x] Task 2 — Package scripts, root runner and manifest contract — 2026-10-21 · uncommitted
- [ ] Task 3 — READMEs and full regression gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `vitest.config.mts` at the repository root drives every suite; each package still runs its own tests from its own folder.

**Architecture:** The root config declares named Vitest `projects` (`root`, `client`, `common`, `common-broker`, `auth`, `tickets`, `orders`, `expiration`), each pinned to its folder with today's include/exclude, setup file and timeouts. Packages call `vitest run --config ../vitest.config.mts --project <name>` with their own Vitest install. The root runner selects only `root` and `client`.

**Tech Stack:** Vitest 5.0.5, Node 24, TypeScript 7.

**Spec:** approved in chat on 2026-10-21 (small change; no separate spec document).

## Global Constraints

- Preserve every assertion and the 84-test total; nothing skipped.
- Per-project settings are identical to the deleted configs (include, exclude, setupFiles, testTimeout, hookTimeout, fileParallelism false, globals, node environment; `restoreMocks` only where it was).
- Root `test/` stays where it is.
- Every backend keeps its own `vitest` devDependency and runs from its own folder (CI matrix).
- The config must load without the root `node_modules` (CI broker job installs only `common`): type-only import from `vitest/config`.
- Root `test/` and `client/test/` keep running through the root Vitest.

## Review Focus

- A service run from its own folder must resolve the project's `root` to that service, not to the cwd or repository root — verified by running each service from its folder.
- The root runner must not start backend projects (they would load a second Vitest copy) — `--project root --project client` in `scripts/vitest.sh`.
- `common` default run must still exclude `test/broker/**`.
- The broker job (no root install) must still load the config — config has no runtime import.

---

### Task 1: Root projects config

**Files:**

- Modify: `vitest.config.mts`
- Delete: `auth/vitest.config.mts`, `tickets/vitest.config.mts`, `orders/vitest.config.mts`, `expiration/vitest.config.mts`, `common/vitest.config.mts`, `common/vitest.broker.config.mts`

- [x] 2026-10-21 · uncommitted — Step 1: Write the projects config (shared `test` defaults at top level, projects extend them).
- [x] 2026-10-21 · uncommitted — Step 2: From `auth/`, `vitest run --config ../vitest.config.mts --project auth` passed 4 files / 12 tests; project root resolved to `auth`.

### Task 2: Scripts and manifest contract

**Files:**

- Modify: `auth|tickets|orders|expiration/package.json` scripts `test`, `test:watch`, `test:ci`
- Modify: `common/package.json` scripts `test`, `test:watch`, `test:broker`
- Modify: `scripts/vitest.sh`, `test/package-manifests.test.cjs`

- [x] 2026-10-21 · uncommitted — Step 1 (failed as expected, 1 of 7): Update `test/package-manifests.test.cjs` expectations to `vitest run --config ../vitest.config.mts --project <dir>` / `vitest --config ../vitest.config.mts --project <dir>`; run `npm run test:manifests` — expect FAIL.
- [x] 2026-10-21 · uncommitted — Step 2: Scripts updated; `test:manifests` passes. `test:routing` passes (4 files) after `npm --prefix client ci` restored the missing local `react-router` install.

### Task 3: Docs and gate

**Files:**

- Modify: `README.md`, `scripts/README.md`, `test/README.md`, package READMEs where they describe configs

- [x] 2026-10-21 · uncommitted — Step 1: Updated `README.md`, `scripts/README.md`, `common/README.md`; CI workflow needed no change.
- [ ] Step 2 (broker: 2 passed with podman NATS, 2026-10-21; prettier clean): Run `npm test` (manifests, services incl. typechecks, routing) and the broker/acceptance suites where infrastructure allows — expect same counts as before.

## Decisions

- 2026-10-21 — One root `vitest.config.mts` with named projects; package configs deleted. Reason: user wants fewer config files.
- 2026-10-21 — Each service keeps running its own tests from its folder and keeps its own `vitest` dependency. Reason: user requirement (CI matrix isolation).
- 2026-10-21 — Root `test/` stays in place (no `acceptance/test` move). Reason: user decision.
- 2026-10-21 — Type-only import in the config instead of `defineConfig` (assistant's call). Reason: the broker CI job and service-only installs have no root `node_modules`.
- 2026-10-21 — Client tests stay under the root runner as project `client` (assistant's call). Reason: client has no Vitest dependency.
- 2026-10-21 — Moving backends under a `services/` folder is a separate, later change. Reason: user chose to finish the Vitest consolidation first; the move touches Compose, lockfiles, CI and dev scripts.

## Blockers

None.
