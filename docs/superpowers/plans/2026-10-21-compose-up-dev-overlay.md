# Compose Up With Dev Overlay Implementation Plan

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-21

## Tasks

- [x] Task 1 — `compose:up` starts the full stack with the dev overlay — 2026-10-21

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run compose:up` starts the application, nginx and the infra with the dev overlay (infra ports on `127.0.0.1`, Redis Insight, NUI); `compose:infra` stays infra-only; `compose:acceptance` and CI stay on the plain production stack.

**Architecture:** In `scripts/compose.cjs`, the `up` action prefixes the existing `dev` file list: `compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build -d`.

**Tech Stack:** Node 24, Docker/Podman Compose.

**Spec:** approved in chat on 2026-10-21 (small change).

## Global Constraints

- `compose:acceptance` unchanged: `up --build -d` then `up -d --force-recreate --no-deps orders`, no overlay.
- CI acceptance job unchanged (`docker compose up --build -d`).
- `compose:infra` and `compose:down` unchanged.

## Review Focus

- Docs that still describe `compose:up` as the plain production stack without published infra ports.

---

### Task 1: Overlay on `up`

**Files:** `test/compose.test.cjs`, `scripts/compose.cjs`, `README.md`, `scripts/README.md`, `docs/superpowers/specs/2026-10-20-prod-compose-nginx-design.md`

- [x] 2026-10-21 — Step 1: Expect `calls('up')` to equal `[[...dev, 'up', '--build', '-d']]`; `npm run test:manifests` — failed as expected; test renamed to "actions use the dev overlay, except acceptance on the plain prod stack".
- [x] 2026-10-21 — Step 2: Prefix `up` with `dev` in `scripts/compose.cjs`; rerun — `test:manifests` 2 files passed.
- [x] 2026-10-21 — Step 3: README (shortcut paragraph, data-browser entries), `scripts/README.md` and the prod Compose spec (amendment line) updated.

## Decisions

- 2026-10-21 — `compose:up` uses the dev overlay and starts everything. Reason: user wants `compose:up` to launch infra and everything.
- 2026-10-21 — `compose:acceptance` stays without the overlay. Reason: user decision ("not needed").

## Blockers

None.
