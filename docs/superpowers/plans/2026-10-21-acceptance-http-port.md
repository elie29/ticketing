# Acceptance Target Follows HTTP_PORT Implementation Plan

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-21

## Tasks

- [x] Task 1 — `vitest` launcher fills `HTTP_PORT` from the root `.env` — 2026-10-21 · uncommitted
- [x] Task 2 — Acceptance target resolution, docs and final gate — 2026-10-21

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run test:acceptance` targets the port Compose publishes (`HTTP_PORT`, from the shell or the root `.env`) without an exported `ACCEPTANCE_BASE_URL`.

**Architecture:** The launcher owns reading `.env`: `scripts/actions/vitest.cjs` gains a pure `vitestEnvironment(base, envFileText)` (same shape as `dev`'s `devEnvironment`) and receives `readFile` from the launcher context (dependency inversion). The acceptance test only reads environment variables and owns the URL resolution order.

**Tech Stack:** Node 24 CommonJS, Vitest 5 root project.

**Spec:** `docs/superpowers/specs/2026-10-21-acceptance-http-port-design.md`

## Global Constraints

- Resolution order: `ACCEPTANCE_BASE_URL`, else `http://localhost:${HTTP_PORT}`, else `http://localhost`; empty `HTTP_PORT` counts as unset.
- Only `HTTP_PORT` is taken from `.env`; the shell value wins; a repeated name keeps its first value.
- No change to Compose, `.env.example`, CI workflow, `dev` or acceptance scenarios.
- Never commit or push; leave changes in the working tree.

## Review Focus

- `HTTP_PORT=` (empty) in `.env` → nothing added; target stays `http://localhost`. Test: `vitestEnvironment ignores an empty HTTP_PORT` (Task 1).
- `HTTP_PORT` set in the shell to a different value than `.env` → shell wins. Test: `vitestEnvironment keeps the shell HTTP_PORT` (Task 1).
- No `.env` (CI) → environment passed unchanged. Test: `vitestEnvironment without a .env adds nothing` (Task 1).
- Secrets in `.env` (`JWT_KEY`, `MONGO_ROOT_PASSWORD`) never reach the test process. Asserted in `vitestEnvironment takes only HTTP_PORT from .env` (Task 1).
- CRLF `.env` (Windows) → value has no trailing `\r`; covered by the existing `parseEnvFile` split on `\r?\n`, asserted in the same test with a CRLF fixture (Task 1).

---

### Task 1: `vitest` launcher fills `HTTP_PORT` from the root `.env`

**Files:**

- Modify: `scripts/actions/vitest.cjs`
- Test: `test/launchers.test.cjs` (`package actions` describe: `act` helper and the two `vitest` tests; new tests below them)

**Interfaces:**

- Produces: `vitestEnvironment(base: object, envFileText: string | null) => object` exported as a property of the action (`module.exports = Object.assign(vitest, { vitestEnvironment })`, as `dev` does). The action reads `readFile(path.join(root, '.env'))` from its context and passes `{ cwd: root, env: vitestEnvironment(process.env, text) }` to `run`.

- [x] **Step 1: Write the failing tests**

In `act`, pass `readFile` through (default `() => null`). Update `vitest runs the root and client projects with node from the root` to expect `{ cwd: R, env: <object> }` and assert the `.env` was read from `path.join(R, '.env')`. Add, inside `package actions`:

```js
const { vitestEnvironment } = require("../scripts/actions/vitest.cjs");

test("vitestEnvironment takes only HTTP_PORT from .env", () => {
  const env = vitestEnvironment(
    { PATH: "p" },
    "JWT_KEY=secret\r\nHTTP_PORT=8080\r\nHTTP_PORT=9090\r\nMONGO_ROOT_PASSWORD=x\r\n",
  );
  assert.deepEqual(env, { PATH: "p", HTTP_PORT: "8080" });
});
test("vitestEnvironment keeps the shell HTTP_PORT", () => {
  assert.deepEqual(vitestEnvironment({ HTTP_PORT: "81" }, "HTTP_PORT=8080"), {
    HTTP_PORT: "81",
  });
});
test("vitestEnvironment ignores an empty HTTP_PORT", () => {
  assert.deepEqual(vitestEnvironment({}, "HTTP_PORT="), {});
});
test("vitestEnvironment without a .env adds nothing", () => {
  assert.deepEqual(vitestEnvironment({ PATH: "p" }, null), { PATH: "p" });
});
```

- [x] **Step 2: Run to verify they fail**

Run: `npm run test:manifests` Expected: FAIL — `vitestEnvironment is not a function` and the `vitest runs …` expectation mismatch.

- [x] **Step 3: Implement `vitestEnvironment` and pass `env` in `scripts/actions/vitest.cjs`**

Copy `base`; use `parseEnvFile` from `../lib/env-file.cjs`; when `!('HTTP_PORT' in base)`, take the file's first `HTTP_PORT` and add it only if non-empty. Comment style matches `dev.cjs`.

- [x] **Step 4: Run to verify they pass**

Run: `npm run test:manifests` Expected: all pass (the count before Task 1 + 4 new).

### Task 2: Acceptance target resolution, docs and final gate

**Files:**

- Modify: `test/acceptance/ticketing.test.cjs:5`
- Modify: `README.md` (acceptance paragraph near line 222; Ports section line 226)
- Modify: `test/README.md`

**Interfaces:**

- Consumes: `HTTP_PORT` in the test process environment (Task 1).

- [x] **Step 1: Resolve `baseURL`** in the order of the Global Constraints: `ACCEPTANCE_BASE_URL`, else `localhost` on `HTTP_PORT` when it is non-empty, else `localhost` on port 80.
- [x] **Step 2: Docs.** README line 226: Compose defaults `HTTP_PORT` to 80; `.env.example` sets 8080. README line 222 and `test/README.md`: the resolution order, and that `npm run test:acceptance` reads `HTTP_PORT` from the root `.env` when the shell has not set it.
- [x] **Step 3: Gate.**
  - `npm test` → passes.
  - With no `ACCEPTANCE_BASE_URL` in the shell and the 8080 stack up: `npm run test:acceptance` → 6 passed.
  - `npx prettier --check README.md test/README.md docs/superpowers/specs/2026-10-21-acceptance-http-port-design.md docs/superpowers/plans/2026-10-21-acceptance-http-port.md` → clean.
- [x] **Step 4: Leave the changes for the owner to commit.** Set `Status: done` and update this plan.

## Decisions

- 2026-10-21 — Acceptance target follows `HTTP_PORT` (option 2) plus README fix (option 3): the root `.env`/`.env.example` set 8080 while the test defaulted to port 80, so the suite could not connect.
- 2026-10-21 — The launcher reads `.env`, the test reads only the environment (single responsibility; direct Vitest runs with `HTTP_PORT` exported also work).
- 2026-10-21 — Only `HTTP_PORT` is forwarded from `.env`, keeping secrets out of the test process.
- 2026-10-21 — CI unchanged: no `.env`, no `HTTP_PORT`, target stays `http://localhost`.
- 2026-10-21 — Native (inline) execution chosen by the owner; work stays uncommitted on `main` (no worktree), since only the owner commits.
- 2026-10-21 — Task 1 gate: `npm run test:manifests` 34/34 (5 new/updated tests seen failing first). Task 2 gate: `npm test` green; `npm run test:acceptance` 6/6 on the 8080 stack with no `ACCEPTANCE_BASE_URL`; Prettier clean.
- 2026-10-21 — Final review (fresh reviewer): no Critical/Important. Deferred minors, left to the owner: (1) the shared `.env` parser keeps quotes and inline comments (`HTTP_PORT="8080"` would break the URL; `dev` has the same gap, out of scope); (2) the launcher test computes its expected `env` with `vitestEnvironment` itself; (3) `test/README.md` "; The suite" capital T; (4) no test pins an empty shell `HTTP_PORT`.
