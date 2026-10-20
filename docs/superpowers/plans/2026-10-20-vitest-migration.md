# Vitest Migration

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 1 - Prove auth migration — 2026-10-20
- [x] Task 2 - Migrate remaining backend suites — 2026-10-20
- [x] Task 3 - Migrate root, routing, and common suites — 2026-10-20
- [x] Task 4 - Run complete regression gate — 2026-10-20
- [x] Task 5 - Update docs and migration records — 2026-10-20

## Goal

Use Vitest consistently instead of Jest/SWC and node:test, preserving all 84 verified tests, Node 24, existing root test commands, real temporary MongoDB service tests, and real Redis/NATS/MongoDB acceptance including automatic expiration. No assertions may be weakened or skipped.

## Task 1 - Prove Auth Migration

- [x] 2026-10-20 - Verify latest stable Vitest 5.0.5 supports Node 24.
- [x] 2026-10-20 - Remove Jest/SWC/types from auth and add Vitest Node config with globals, existing setup, sequential files, and 60-second test/hooks.
- [x] 2026-10-20 - npm install audit: zero vulnerabilities. Auth typecheck and all 12 tests passed under Vitest.

## Task 2 - Remaining Backends

- [x] 2026-10-20 - Change tickets/orders/expiration manifests and compiler globals to the same Vitest version/scripts and add Node configs.
- [x] 2026-10-20 - Migrate mocks/types to vi/Mock without changing assertions; use a constructible Bull mock under Vitest and preserve timer/publication failure checks.
- [x] 2026-10-20 - Install packages and pass every backend typecheck/suite: auth 12, tickets 23, orders 26, expiration 4.

## Task 3 - Root, Routing, Common

- [x] 2026-10-20 - Replace node:test with Vitest globals while retaining .cjs filenames, preserving all 3 manifest, 7 routing, 3 common, and 6 acceptance cases. Native-module file renames proved unnecessary.
- [x] 2026-10-20 - Replace Node context APIs with onTestFinished/vi.spyOn, retain real HTTP and expiration timeouts, and pass all migrated root/shared suites.
- [x] 2026-10-20 - Preserve WSL-safe root commands, refresh lockfiles, remove Jest/SWC/types, and install root test tooling in CI with lifecycle scripts disabled.

## Task 4 - Full Gate

- [x] 2026-10-20 - Validate dependencies/devDependencies/engines against all seven lockfiles and pass manifest cohesion checks. No runtime Jest/node:test usage remains; the ts-jest prohibition is an intentional guard.
- [x] 2026-10-20 - CI=1 npm test passed end to end against the real 15-second acceptance stack: all 84 tests, shared/backend typechecks, and frontend production build passed with no skipped tests.
- [x] 2026-10-20 - Review Docker/common source boundaries and CI installation paths. Focused independent review at 56a995d reported no material findings. Add root config/lockfile CI triggers.

## Task 5 - Documentation

- [x] 2026-10-20 - Update README for Vitest, unchanged root commands, 84-test result, fast real expiration acceptance, 900-second normal default, and CI setup.
- [x] 2026-10-20 - Record final results and close the plan; no further implementation step remains for the runner migration.

## Verification Results

- Implementation commit: 56a995d. User commits are preserved; no assistant commit or push was performed.
- Executed full gate: CI=1 npm test on Node 24 in WSL; complete output: /tmp/ticketing-vitest-all-tests.log.
- Test totals: manifests 3, common HTTP contracts 3, auth 12, tickets 23, orders 26, expiration 4, acceptance 6, routing 7; 84 passed, none skipped.
- Shared/backend typechecks and Next.js production build passed in the same root run.
- Root and all six package manifest/lockfile dependency and engine checks passed again during closure.
- Temporary validation task files and emitted config artifacts were removed. TypeScript compilation now excludes test-runner configs from production source output.

## Decisions

- 2026-10-20 - User requested all plans be updated from actual evidence. Keep this runner migration closed and preserve its original 84-test baseline; later added coverage and external test layout are completed in the plans referenced below, not missing runner-migration tasks.
- 2026-10-20 - User approved the proposed full Vitest migration with "go" after being told this includes Jest and Node test suites, mocks/hooks, and preserving all 84 tests.
- 2026-10-20 - Keep framework-specific production code and existing application contracts unchanged; this migration changes test runners/tooling only unless a demonstrated compatibility issue requires a focused correction.
- 2026-10-20 - Use Vitest's native TypeScript support and separate tsc checks; do not retain Jest/SWC or introduce experimental VM-module flags.
- 2026-10-20 - Existing expiration acceptance implementation was verified before migration: 15-second test-stack lifetime and default 900-second normal lifetime; preserve both.
- 2026-10-20 - Close completed migration tasks at the user's request and clear resolved blockers. Keep remote execution and broader runtime verification limits explicit rather than claim they were tested.

## Verification Limits

The latest GitHub-hosted Vitest workflow was not independently observed. The original local full-container gate passed 84 tests. Subsequent work passed a complete 100-test root gate and two separate real-broker tests; this plan audit does not rerun them. Focused browser coverage subsequently passed in the completed client plan. Source-watch recompilation and runtime/diagnostic cleanup remain in the active development Compose plan. Load testing and comprehensive security/accessibility certification are not claimed, and production Docker was cancelled.

## Current Reconciliation

- 2026-10-20 - Vitest remains the runner throughout root/common/client/backends. No Jest/SWC migration task remains open; the historical 84 cases were preserved while new assertions increased executed coverage to 100 root plus 2 isolated broker tests.
- 2026-10-20 · 56a995d - Backend test specs, setup and NATS mocks moved into package-level test/ folders. Vitest discovery and TypeScript no-emit coverage were updated; 20 backend suites and all assertions were retained.
- 2026-10-20 · 56a995d - Compose/layout checks and isolated broker tests were added, along with separate broker CI execution. The default shared unit suite excludes the explicit broker suite, so it does not require a live broker or silently skip integration cases.
- 2026-10-20 - See [the completed frontend plan](2026-10-20-ticket-order-client.md) for browser/docs delivery and [the active development plan](2026-10-20-production-jetstream.md) for the only remaining runtime/cleanup task. All package README names and links use the user's uppercase casing; branding is TicTix.

## Blockers

None.

- 2026-10-20 — Commit references point at the initial commit `56a995d`, which holds this plan's work; the earlier commits `24dd9f5`, `87631d2`, `c7e0bc1` are no longer in `main`'s history.
