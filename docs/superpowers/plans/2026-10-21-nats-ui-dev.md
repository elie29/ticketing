# NATS UI in Dev Compose Implementation Plan

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-21

## Tasks

- [x] Task 1 — NUI service in the dev overlay, started by `compose:infra`, documented — 2026-10-21

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run compose:infra` also starts a NATS web UI at <http://127.0.0.1:31311> with a preconfigured `ticketing` connection.

**Architecture:** A `nui` service (`ghcr.io/nats-nui/nui:0.9.3`) in `docker-compose.dev.yaml`, loopback-only, depending on healthy `nats`. A read-only NATS CLI context file `deploy/nui/ticketing.json` (`url: nats://nats:4222`) is imported at startup via `--nats-cli-contexts /nats-cli-contexts`. No `/db` volume: settings reset on recreate, like Redis Insight.

**Tech Stack:** Docker/Podman Compose, NUI 0.9.3, NATS 2.12.

**Spec:** approved in chat on 2026-10-21 (small change).

## Global Constraints

- Published on `127.0.0.1` only (NUI web mode has no login).
- Image pinned to `0.9.3` (latest stable; `0.10.0-beta.1` is pre-release).
- `compose:infra` service list order: `mongo`, `redis`, `nats`, `redisinsight`, `nui`.

## Review Focus

- The context import is documented but unproven here; the user checks the UI visually. Fallback: add the connection manually in the UI.

---

### Task 1: NUI service

**Files:**

- Modify: `test/compose.test.cjs`, `scripts/compose.cjs`, `docker-compose.dev.yaml`, `README.md`
- Create: `deploy/nui/ticketing.json`

- [x] 2026-10-21 — Step 1: Add `'nui'` to the infra `up` expectation in `test/compose.test.cjs`; `npm run test:manifests` — failed as expected (infra assertion).
- [x] 2026-10-21 — Step 2: Add `'nui'` to the infra list in `scripts/compose.cjs`; add the overlay service and context file; rerun — `test:manifests` 2 files passed; merged `podman compose config` renders `nui` as intended.
- [x] 2026-10-21 — Step 3: Update README infra section (start list, ports, URL entry); dev-overlay line in `docs/superpowers/specs/2026-10-20-prod-compose-nginx-design.md` updated.

## Decisions

- 2026-10-21 — NUI chosen as the NATS UI (assistant's call, approved by the user). Reason: open-source NATS web UI that browses streams/messages and subscribes to subjects.
- 2026-10-21 — No container run check by the assistant; the user verifies the UI visually. Reason: user decision.
- 2026-10-21 — No persistent `/db` volume (assistant's call). Reason: matches Redis Insight and avoids duplicate imported connections.

## Blockers

None.
