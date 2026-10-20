# CI Local Common Lockfile Fix

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 1 - Reproduce lockfile mismatch — 2026-10-20
- [x] Task 2 - Repair lockfiles and CI ordering — 2026-10-20
- [x] Task 3 - Validate clean installs and tests — 2026-10-20
- [x] Task 4 - Add root install/update commands — 2026-10-20
- [x] Task 5 - Align manifests and migrate backend tests — 2026-10-20
- [x] Task 6 - Run all tests against upgraded stack — 2026-10-20
- [x] Task 7 - Support infrastructure-only watched development — 2026-10-20 (runtime follow-up deferred)
- [x] Task 8 - Document development modes and test results — 2026-10-20

## Closure

Closed on 2026-10-20 at the user's request. Lockfile, shared-package, Express and test-runner blockers were resolved. The root gate at that closure passed 84 tests. Preserve the original execution chronology below; later verification and the remaining runtime follow-up are summarized here.

## Current Reconciliation

- 2026-10-20 - CI/common fixes are committed across cb92213, 87631d2 and ae99ee6; no local common publication or npm authentication is required. All consumer lock metadata was aligned, including auth after the JetStream dependency change.
- 2026-10-20 - The complete root npm test later passed 100 tests plus shared/backend typechecks and the client compilation gate; two isolated JetStream replay/resume/redelivery tests passed separately. All 20 backend suites now live outside src/ (24dd9f5), with explicit mock factories and preserved assertions.
- 2026-10-20 - Development Compose now starts applications by default; tools remain opt-in. The exact override/Windows/Linux engine contract, native Windows non-destructive override check and real direct/shortcut Podman validation passed. c7e0bc1/95e3bf3 supersede this plan's original app-profile-only default and unconditional WSL Compose relay.
- 2026-10-20 - The previously deferred compose:infra switching and local npm run dev startup were exercised: infrastructure stays healthy, HTTP backends respond, expiration connects and the frontend proxy returns 200. Actual common-source content-change recompilation and final diagnostic/process cleanup remain unverified/open in [Task 4 of the development Compose plan](2026-10-20-production-jetstream.md).
- 2026-10-20 - Package/support READMEs and reusable VS Code tasks are delivered. Two later temporary diagnostic entries still require cleanup; do not confuse them with the removed initial validation tasks. Production Docker was cancelled, not left as pending deployment work.
- 2026-10-20 - This plan audit does not rerun tests or inspect GitHub-hosted results. Browser auth/create/edit/reserve/cancel/release/order-history and focused desktop/mobile checks subsequently passed; no external security/accessibility/load certification is claimed.

## Goal

Fix the reported npm ci manifest/lockfile mismatch without disabling strict lockfile validation or reopening the administratively closed dependency-upgrade tracker.

## Task 1 - Reproduce Lockfile Mismatch

- [x] 2026-10-20 - Compare all four consumers: auth was synced, but tickets/orders/expiration still locked registry common ^1.0.9 while manifests declared file:../common.
- [x] 2026-10-20 - Reproduce npm ci EUSAGE in tickets: common 1.0.9 does not satisfy local common 2.0.0.

## Task 2 - Repair Lockfiles and CI Ordering

- [x] 2026-10-20 - Regenerate tickets/orders/expiration lockfiles using npm install --package-lock-only --ignore-scripts, without changing direct dependency ranges or forcing peers.
- [x] 2026-10-20 - Confirm npm ci --dry-run accepts each regenerated lockfile.
- [x] 2026-10-20 - Add Node 24 setup, common clean install/build before each service, npm caching, and common/** CI change triggers. Retain npm ci and existing service suites.

## Task 3 - Validate Clean Installs and Tests

- [x] 2026-10-20 - Clean-install common and auth, and compile common on Node 24. Clean-install tickets/orders/expiration with --ignore-scripts to verify lock/link resolution independently of legacy postinstall hooks. All four consumers resolve the local common build.
- [x] 2026-10-20 - Execute the updated CI ordering through auth's test command. Install/build succeeds; all four auth suites then fail compilation at src/app.ts:43 with TS2769 on app.use(errorHandler), before any tests run. This is a separate Express 4/5 middleware-type incompatibility, not a remaining npm ci error.
- [x] 2026-10-20 - Check all six manifests against root lockfile dependency/devDependency entries and all four common link records: passed. Workflow editor diagnostics: no errors. git diff --check: passed (line-ending warnings only).
- [x] 2026-10-20 - Update README CI ordering/triggers and preserve the outstanding Express compatibility/full-stack verification caveats.
- [x] 2026-10-20 - Resolve Express compatibility and run all four backend suites on the cohesive Node 24 stack: auth 12 tests, tickets 23, orders 17, expiration 4; all pass with typechecks.

## Verification Results

- Reproduction: tickets npm ci --dry-run rejected registry common 1.0.9 against local common 2.0.0 before repair.
- After repair: npm ci --dry-run passed in tickets, orders, and expiration; real clean installs and local common resolution passed for all four consumers (postinstall scripts skipped in the three focused install checks).
- Updated CI sequence: common npm ci/build and auth npm ci passed. auth npm run test:ci -- --runInBand failed with four failed suites, zero tests executed, TS2769 at app.use(errorHandler).
- All six dependency manifests/lockfiles passed structured synchronization assertions; no direct dependency ranges changed for this fix.
- Workflow diagnostics and diff whitespace validation passed. GitHub-hosted execution itself has not been rerun from this environment; no commits or pushes were made.
- Full npm test gate subsequently passed on Node 24 against rebuilt containers: manifest 3, routing 7, common HTTP contracts 3, auth 12, tickets 23, orders 17, expiration 4, acceptance 5; total 74 passed. Shared/backend typechecks and Next.js production build also passed. Full output is in /tmp/ticketing-all-tests.log in WSL.
- Full Compose startup succeeded with common exiting 0 and application APIs healthy. Acceptance first exposed the obsolete Next Link-with-anchor pattern; updating the header to the current API and force-recreating the client resolved it. All five acceptance tests then passed, and passed again in the full npm test gate.
- Subsequent completed work supersedes the historical failure notes: configurable order lifetime, real automatic-expiration acceptance, and Vitest migration are implemented in 87631d2. The latest CI=1 npm test passed 84 tests with no skipped cases, including all six acceptance scenarios against real MongoDB/Redis/NATS. Root and all six package lockfiles match their manifests/engines.

## Task 4 - Add Root Install/Update Commands

- [x] 2026-10-20 - Add npm run install and npm run update at the repository root, reusing the existing Bash scripts for the requested WSL environment.
- [x] 2026-10-20 - Keep installation lockfile-based with npm ci; install/build common first, then auth/tickets/orders/expiration/client. Root npm install also invokes the install lifecycle script.
- [x] 2026-10-20 - Change the updater from rebuilding only common to running npm update across all six packages within declared semver ranges, building common before consumers. Forward arguments and stop on failure in both scripts.
- [x] 2026-10-20 - Run bash syntax validation and npm run install -- --dry-run --ignore-scripts --no-audit --no-fund in WSL: passed across all six packages, including actual common compilation.
- [x] 2026-10-20 - Run npm run update -- --dry-run --ignore-scripts --no-audit --no-fund in WSL: passed across all six packages; no dependency upgrade was applied by this validation.
- [x] 2026-10-20 - Document commands, lifecycle behavior, semver limits, and dry-run usage. Editor diagnostics and scoped git diff --check passed.

## Decisions

- 2026-10-20 - User requested every plan be reconciled. Keep this completed CI-fix plan closed, preserve historical failures and administrative deferrals, and record which later work resolved them. Only the development Compose plan owns the remaining watcher proof/cleanup.
- 2026-10-20 - User agreed to Tailwind CSS for future client screens. This is a design choice only; no Tailwind installation or frontend feature implementation was requested in this turn.
- 2026-10-20 - User reports the GitHub Actions workflow passed. The acceptance job starts the real Compose app profile, including MongoDB/Redis/NATS, before npm run test:acceptance and stops it afterward. Current acceptance assertions exercise auth/persistence, NATS ticket replication/reservation, and manual cancellation; they do not wait for automatic Redis-backed expiration, so a passing run does not prove that delayed-expiration path end to end. Remote run status was not independently inspected in this turn.
- 2026-10-20 - The earlier automatic-expiration coverage gap was subsequently resolved with a real Redis/Bull/NATS acceptance scenario that waits for expiry, checks cancellation/release, and reserves the released ticket again. The unchanged default is 900 seconds; acceptance startup/CI uses 15 seconds.
- 2026-10-20 - Keep this follow-up narrowly scoped to the reported CI install failure. The prior dependency-upgrade plan was administratively closed, not proof that all migrations/test gates passed.
- 2026-10-20 - Keep reproducible npm ci in CI; repair generated locks rather than replace clean installs with npm install or bypass peer validation.
- 2026-10-20 - Local common is private and must be built from the checkout before consumers run; no npm publication/authentication is involved.
- 2026-10-20 - The reported synchronization failure is repaired without weakening npm ci. Do not describe the complete CI pipeline as passing: executing it exposed the previously unfinished Express major/type alignment.
- 2026-10-20 - User requested root install and update commands. Reuse the existing WSL Bash scripts via npm run install/update, retain common-first ordering, and make update perform conventional range-compatible npm updates rather than silently force breaking major versions. Validate with dry runs so adding the commands does not itself apply unrelated dependency changes.
- 2026-10-20 - User requested cohesive manifests and that every test run and succeed. Align shared versions, private package flags, Node 24 engines, backend commands, Jest/SWC/tsx/TypeScript tooling, and local common links; add manifest drift checks and a full root/CI test gate rather than skip failing suites.
- 2026-10-20 - Native Windows update failed because Windows npm tried to use Linux-installed compiler shims. Route root install/update/test service commands into WSL when launched on Windows; the Windows update dry-run now passes.
- 2026-10-20 - MongoDB driver 7.7 dynamically imports os, which Jest's VM cannot do without the unwanted experimental-module flag. Supply the real Node os module through the driver's supported runtimeAdapters option in test setup. Remove all temporary probes and the falsified Map-global workaround.
- 2026-10-20 - Explicitly retain the legacy express:sess cookie name after cookie-session 2 changed its default. Do not weaken the signout expectation.
- 2026-10-20 - Replace the obsolete concurrency plugin with native optimisticConcurrency and mark the version modified before non-new saves, preserving stale-write rejection and increments on no-change saves. Existing concurrency tests passed.
- 2026-10-20 - Expiration tests exposed a missing await on NATS publication. Queue jobs now wait for publish completion and reject on publication failure; four focused worker tests pass.
- 2026-10-20 - Clean common/build contents without deleting the directory itself so the Compose output mount can be rebuilt safely.
- 2026-10-20 - User requested full-container and infrastructure-only/local-watch workflows from one Compose file. Default services are MongoDB/Redis/NATS; app and tools profiles add applications/common and mongo-express. NATS remains required for a complete local app. Root compose:up/compose:infra/compose:down choose Podman when available, otherwise Docker.
- 2026-10-20 - Add concurrently as root development tooling, build/watch common alongside backend tsx watchers and Next dev, include common/build changes in backend watch paths, and use localhost defaults for local connections. Root install/update also manage root tooling without lifecycle recursion.
- 2026-10-20 - Keep full application test assertions intact. Fix the Next Link API in production code and add bounded acceptance readiness rather than accept HTTP error pages or skip startup failures.
- 2026-10-20 - User requested the README be updated accordingly. Document both modes, switching/ports, Node 24/Windows-to-WSL behavior, root tooling/dependency commands, all test gates, and expanded CI. Record the verified full-stack results but do not claim hybrid watch runtime or GitHub-hosted CI has been verified.
- 2026-10-20 - User requested closing all tasks and clearing disappeared blockers. Close completed work from executed evidence; close the unrun hybrid watch checks as explicitly deferred follow-up rather than fabricate runtime results. Vitest replaces the interim Jest/SWC stack.

## Task 5 - Align Manifests and Migrate Backend Tests

- [x] 2026-10-20 - Add three manifest contract checks; observe failures before alignment, then all three pass.
- [x] 2026-10-20 - Upgrade all backends to matching Express 5/JWT 9/validator 7/Mongoose 9/Jest 30/TypeScript 7/SWC/tsx versions, with Bull 4 in expiration. Keep Node 24 and private/local package conventions consistent.
- [x] 2026-10-20 - Migrate catch-all handlers, JSON parsing, cookie naming, Mongoose documents/hooks/connections, ObjectId fixtures, and memory-server lifecycle without dropping tests.
- [x] 2026-10-20 - Run backend typechecks and suites: auth 4 suites/12 tests, tickets 7 suites/23 tests, orders 7 suites/17 tests, expiration 1 suite/4 tests; all passed.
- [x] 2026-10-20 - Add and run three real HTTP contract tests for common validation fields, rejected async handlers, and unauthorized requests; all passed after common build.

## Task 6 - Run All Tests Against Upgraded Stack

- [x] 2026-10-20 - Add root manifest/service test commands and a common/backend typecheck/test plus frontend-build runner. Extend CI to include expiration, client build/routing checks, and Compose acceptance.
- [x] 2026-10-20 - Validate shell syntax, root manifest/routing commands, and root install dry-run across root tooling and all six packages.
- [x] 2026-10-20 - Rebuild full Compose and verify live state without deleting volumes or unrelated containers. Common exits 0; API containers are healthy. Force-recreate the changed client when Podman retained its prior image.
- [x] 2026-10-20 - Run npm test end to end successfully: all 74 tests, shared/backend typechecks, and frontend production build pass; no test was skipped or weakened to obtain the result.
- [x] 2026-10-20 - Update README with verified commands/results and record the exact full gate outcome.
- [x] 2026-10-20 - Sync the design with the implemented private local common, Node 24, Compose profiles, Vitest, and real expiration coverage. The focused migration review at 87631d2 found no material issues; no full production-readiness certification is claimed.

## Task 7 - Support Infrastructure-Only Watched Development

- [x] 2026-10-20 - Add app/tools Compose profiles and root full/infra/down commands; infra selection stops this project's app containers to release ports and retains MongoDB/Redis/NATS.
- [x] 2026-10-20 - Add root dev launcher with concurrently, common compilation/watch, four common-aware tsx watchers, Next dev, and localhost service configuration.
- [x] 2026-10-20 - Install concurrently 10.0.6 and generate the root lockfile; root dependency audit reported zero vulnerabilities. Include root tooling in install/update with --ignore-scripts to prevent recursion.
- [x] 2026-10-20 - Validate shell syntax and manifest checks; actual Compose selections are three default infrastructure services and ten full-profile services. Root install dry-run passes.
- [x] 2026-10-20 - Exercise compose:up and pass the complete test gate against the rebuilt full-container mode.
- [x] 2026-10-20 - Closed at user request; runtime verification deferred: execute compose:infra and confirm only infrastructure containers remain running. Profile/configuration selection was verified, but this switching sequence was not executed.
- [x] 2026-10-20 - Closed at user request; runtime verification deferred: start npm run dev, run acceptance, and verify source/common watch restarts. The commands are implemented; no watched-mode success is claimed.

## Task 8 - Document Development Modes and Test Results

- [x] 2026-10-20 - Read current root commands, Compose/dev scripts, workflow, README, and history before editing; preserve user changes.
- [x] 2026-10-20 - Document full-container and infrastructure/local-watch workflows, Node 24/WSL prerequisites, NATS requirement, port conflicts, common compilation, process lifecycle, and package commands.
- [x] 2026-10-20 - Replace stale migration/Express-blocker statements with manifest alignment and the observed 74-test full gate result; document individual suites and expanded CI without claiming remote CI execution.
- [x] 2026-10-20 - git diff --check -- readme.md passed; editor diagnostics reported no errors. Only README and this continuity tracker changed for the latest documentation request.

## Verification Limits

At original closure, infrastructure switching, local watchers and browser interactions were deferred. Later switching, startup/proxy and targeted browser checks passed as recorded above. Actual common-source recompilation and task/process cleanup remain open in the active development plan. GitHub-hosted execution, a real Docker Desktop daemon and comprehensive performance/security/accessibility certification were not independently verified.

## Blockers

None.
