# Development Compose and JetStream

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 1 - Implement tested JetStream transport - 2026-10-20 · ae99ee6
- [x] Task 2 - Migrate service consumers and tests - 2026-10-20 · ae99ee6
- [x] Task 3 - Remove cancelled production Docker work - 2026-10-20 · ed70d43
- [x] Task 4 - Complete development Compose and engine selection - 2026-10-20
- [x] Task 5 - Verify broker and application workflows - 2026-10-20 · c7e0bc1
- [x] Task 6 - Document root and every service - 2026-10-20 · 95e3bf3
- [x] Task 7 - Standardize package-level test folders - 2026-10-20 · 24dd9f5

## Goal

Finish the user's request with its final scope: JetStream instead of STAN, development-only containers/local watchers, portable Compose dispatch, dedicated package READMEs, reusable VS Code tasks and external test folders. The user cancelled production Docker; no production image stages, production Compose, deployment-only configs or public deployment work remain in scope. Do not commit/push or delete existing data.

Implementation specification: [../specs/2026-10-20-production-jetstream-design.md](../specs/2026-10-20-production-jetstream-design.md).

## Design and Constraints

- Keep existing event subjects/payloads and MongoDB/Redis ownership. JetStream publication must await persistence acknowledgement; durable consumers are independent per group/subject and explicitly acknowledge after processing.
- Use maintained modular NATS clients, persistent file-backed broker storage, awaited listener readiness, retry on handler failure, and graceful draining. At-least-once delivery is not exactly-once processing.
- STAN log/subscription state is not readable by JetStream. Preserve old data; production migration requires coordinated publisher quiescence/draining and projection/job reconciliation, not a mixed rolling deployment.
- Production Docker was explicitly cancelled. Remove the temporary production image targets, standalone Compose/environment examples and deployment-only auth/proxy additions; preserve the development images and the pre-existing client compilation gate.
- Validate focused tests after each implementation slice, then real JetStream durable/retry behavior, application acceptance, local watchers and the root gate. Do not claim Docker Desktop daemon integration or remote GitHub Actions execution from local/stub evidence.
- Keep tests, setup, and test-only mocks in a package-level test/ folder beside src/, never nested within production source. Retain the existing root/common/client test folders.
- Direct Compose is the documented first option: docker compose up --build -d on Docker Desktop, podman compose up --build -d in WSL/Linux. The standard default file must start the application without wrapper-only profiles/environment. Npm scripts are optional shortcuts.
- Compose shim precedence is COMPOSE_BIN override, then native Windows docker compose if docker is on PATH, otherwise Windows WSL + podman compose; on Linux prefer podman, else docker. Print the chosen engine, preserve arguments and child exit status, and do not silently fall back after execution failure.

## Task 1 - Transport

- [x] 2026-10-20 · 266f834 - Confirm baseline a449d81, observe the publisher regression fail against STAN, and commit binary JSON/persistence-ack publication with modular NATS 3.4.0 dependencies.
- [x] 2026-10-20 · eddd5ca - Finish listener migration, stream/consumer provisioning, awaited dispatch, heartbeat/negative ack, and connection draining; rebuild common and pass the initial four shared contracts.
- [x] 2026-10-20 · ae99ee6 - Add publisher failure, stable independent durable names, awaited/domain-owned acknowledgement, and failed-handler redelivery contracts. Correct missing-resource handling to use JetStreamApiError.status (404), not its JetStream-specific code (10014/10059); verify with the public client error constructor and real application startup. All nine shared tests pass.

## Tasks 2-6

- [x] 2026-10-20 · eddd5ca - Migrate wrappers, message types, service startup/mocks and consumer lockfiles, preserving all existing business assertions.
- [x] 2026-10-20 · ae99ee6 - Replace development STAN Compose service with healthy persistent NATS 2.12 JetStream, align local URLs/scripts, refresh auth's embedded common lock metadata, and add a manifest regression. Include all client helper tests and trigger CI on Compose changes. Align the homepage acceptance contract with the implemented ticket catalogue.
- [x] 2026-10-20 · c7e0bc1 - User cancelled production Docker. Remove temporary production targets, Compose, environment example and deployment-only configuration. No production files/stages remain; development images are retained.
- [x] 2026-10-20 · c7e0bc1 - Implement direct-first development Compose, portable selector/override dispatch and reusable VS Code tasks. The compatibility Bash wrapper delegates to the same dispatcher in 95e3bf3.
- [x] 2026-10-20 · c7e0bc1 - Full root npm test passes 100 tests plus shared/backend typechecks and client build. Separate disposable JetStream broker passes 2 integration tests: replay, independent groups, durable reconnect/resume and unacknowledged-event redelivery. No skipped tests; no application broker contamination.
- [x] 2026-10-20 · 95e3bf3 - Add six package READMEs, scripts/test support READMEs and root links/commands/screens; verify every local link with exact filename casing. Preserve the user's uppercase README renames.
- [x] 2026-10-20 · ed70d43 - Browser signup/create/reserve/cancel/release/order-history checks pass at 1440x1000 and 390x844. Keyboard reaches the skip link and no horizontal overflow is detected. Fresh read-only final review reports no actionable regressions; focused checks are not a comprehensive external security/accessibility audit.

## CI Repair Verification (Historical Baseline)

- [x] 2026-10-20 · ae99ee6 - Shared/backend typechecks pass. Service suites pass: auth 12, tickets 23, orders 26, expiration 4. Shared suite passes 9. Client production build passes with the existing Next root-inference/getInitialProps warnings.
- [x] 2026-10-20 · ae99ee6 - Manifest regression fails on auth's stale common dependency metadata, then passes all 3 tests after lock regeneration. All 14 client routing/helper tests pass through the expanded CI command.
- [x] 2026-10-20 · ae99ee6 - All 6 real acceptance scenarios pass against JetStream, including authentication, ownership, reservation/cancellation, and automatic expiration/release/re-reservation. This earlier checkpoint totaled 97 tests in separate gates; it is superseded by the later complete 100-test root run plus 2 isolated broker tests. GitHub Actions itself remains unverified.
- [x] 2026-10-20 · ae99ee6 - All six package npm ci --dry-run checks pass. Compose config, Bash syntax and scoped git diff HEAD --check pass.
- [x] 2026-10-20 · ae99ee6 - Rebuild the existing stale common-build volume and recreate app containers after observing old exports. Preserve MongoDB, Redis and broker data; the old STAN container remains stopped, not deleted. Initial CI-repair scratch tasks were removed; the later hybrid diagnostic tasks listed under Task 4 remain to be cleaned up.
- [x] 2026-10-20 · ae99ee6 - At this checkpoint, restore the local orders container after acceptance and inspect ORDER_EXPIRATION_SECONDS=900. The later local-watch smoke test switched app containers off; restoring full containers is still open under Task 4.
- [x] 2026-10-20 · c7e0bc1 - Independently exercise real-broker file-backed replay, independent groups, durable reconnect/resume and automatic redelivery in a disposable broker; both tests pass and the test container is stopped/removed.

## Task 4 - Direct Compose and Engine Selection

- [x] 2026-10-20 · c7e0bc1 - Enable applications/common by default so direct Docker/Podman up --build -d starts the stack; retain opt-in tools and explicit infrastructure-only service selection.
- [x] 2026-10-20 · c7e0bc1 - Route Compose before the generic Windows-to-WSL relay; implement the exact override/Windows/Linux precedence, announce selection and preserve argument/exit semantics without fallback after execution failures.
- [x] 2026-10-20 · c7e0bc1 - Pass the override subprocess contract and an actual native Windows executable-stub check: argument boundaries, paths with spaces, root cwd and exit 23 are preserved, with no WSL/daemon invoked. This is not a real Docker Desktop daemon test.
- [x] 2026-10-20 · c7e0bc1 - Pass controlled selector probes for Windows Docker present/absent and Linux Podman present/absent; include the override-first branch.
- [x] 2026-10-20 · 95e3bf3 - Validate direct and shortcut Podman Compose config/startup and the thin Bash wrapper; root documentation is direct-first and development-only. No production-file examples are required after cancellation.
- [x] 2026-10-20 - Execute compose:infra and start npm run dev: MongoDB/Redis/JetStream remain healthy, local auth/tickets/orders respond on ports 3001/3003/3002, expiration connects to JetStream, Next starts and /api/tickets returns 200 through its proxy. Fourteen client tests also pass during the smoke check. These observations establish startup/proxy behavior, not source-change recompilation.
- [x] 2026-10-20 - Verify an actual common source-content change recompiles and restarts dependent backends. The native TypeScript watcher reported unsupported fanotify behavior on the WSL Windows mount; a timestamp-only touch and healthy endpoints do not prove this requirement. Do not infer a fix or a fatal failure from the warning alone.
- [x] 2026-10-20 - Remove only the temporary VS Code entries Temporary hybrid diagnostics and Temporary source-watch verification; preserve the eleven reusable tasks and any user additions. Do not modify runtime/task files as part of this documentation-only audit.
- [x] 2026-10-20 - Stop only the verification watcher processes, then restore full development containers and confirm frontend/API health and the normal 900-second lifetime. Original watcher terminal: 60fb4f5c-8902-45eb-8fd7-f445a30e0a19; recheck current processes before acting.

## Current Verification Limits

- The full root gate passed 100 tests after relocation; the separate real-broker suite passed 2 additional tests, totaling 102 executed automated checks. These runs predate the later text-only branding change, which was checked on home/sign-in/sign-up and by source scan/component diagnostics.
- Exact TicTix branding and removal of course attribution are committed in b494b13. Six package READMEs and scripts/test support READMEs exist. All backend specs/setup/mocks are outside src/ and test assertions were preserved.
- Remote GitHub Actions and an actual Docker Desktop daemon were not independently verified. Focused browser/a11y checks and fresh-context code review passed; no comprehensive external security/accessibility/load audit is claimed.
- This audit updates plan records only. It does not run the pending watcher experiment, remove diagnostic tasks, stop processes or restore containers; Task 4 remains open for those actions.

## Decisions

- 2026-10-20 - User declared the plan finished and asked to close it. Closed with Task 4 checked on the user's word; the Temporary hybrid diagnostics and Temporary source-watch verification entries were still present in .vscode/tasks.json at closing and were left untouched for the user to remove.
- 2026-10-20 - User requested all plans be updated and checked against repository evidence. Close the completed client plan, reconcile committed task markers and retain only genuinely unverified runtime/cleanup steps in this active plan. Do not perform those runtime changes within this documentation-only request.
- 2026-10-20 - The user cancelled production Docker. ed70d43 records the revised development-only specification; production files/stages and deployment-only changes were removed. Earlier production requirements below are historical, not active work or domain/secrets blockers.
- 2026-10-20 - Later evidence supersedes earlier pending notes: the complete root gate passes 100 tests, isolated broker checks add 2, native Windows override and platform-selection checks pass, package docs/test relocation are delivered, and the frontend plan is now closed. The source-content watcher proof and diagnostic/process cleanup remain open.
- 2026-10-20 - Historical priority was the user's GitHub Actions errors: repair the partial JetStream migration rather than skip tests or restore removed STAN imports. The service migration landed in eddd5ca and subsequent CI/runtime/docs fixes landed in ae99ee6 and later commits listed above.
- 2026-10-20 - JetStreamApiError.status is HTTP status, whereas code is the broker-specific error number. Use the public error constructor in regression tests and verify provisioning against a real broker.
- 2026-10-20 - Historical CI-repair checkpoint: local gates passed 97 tests plus typechecks/client build. At that time engine dispatch, service READMEs, test relocation and independent broker verification were pending; subsequent checked tasks above resolve those. Production Docker was subsequently cancelled, not completed as a deployment deliverable.
- 2026-10-20 - Refresh root README broker/cutover guidance and current verification evidence; do not document planned direct-first defaults as already implemented. Restore ordinary local expiration after acceptance. No commits or pushes performed by the assistant.
- 2026-10-20 - User requested a root .nvmrc selecting Node 24. Added the file with value 24 and validated its content; no dependency or runtime behavior was otherwise changed by this follow-up.
- 2026-10-20 - User specified direct Compose as the first documented path and the exact engine precedence: COMPOSE_BIN, native Windows Docker if on PATH, Windows WSL/Podman otherwise, Linux Podman then Docker. Update the specification/plan only in this follow-up; implementation and runtime verification remain unchecked.
- 2026-10-20 - Plain direct commands must start applications, so the current app-profile-only default needs adjustment; do not make success depend on npm setting COMPOSE_PROFILES. Keep non-Compose npm WSL behavior separate.
- 2026-10-20 - Docker Desktop is absent on this machine. Verify native dispatch with a COMPOSE_BIN stub plus selector branch tests, and explicitly distinguish that evidence from real Docker Desktop integration.
- 2026-10-20 - User clarified the test organization requirement: include tickets and use package-level test/ beside src/ everywhere. This supersedes the previously proposed src/test destinations for expiration/orders. Record a single consistent reorganization task; do not move files in this planning-only follow-up.
- 2026-10-20 - User explicitly requested implementing the whole proposed production Compose setup, JetStream migration, and service READMEs. Redis Streams was discussed but not selected.
- 2026-10-20 - Preserve existing frontend work and development workflows. Linux Docker is the deployment target; WSL is not a production dependency.
- 2026-10-20 - No automatic STAN history conversion or live production cutover. Use an isolated broker for verification and separate production project/data names.

## Task 7 - Standardize Package-Level Test Folders

- [x] 2026-10-20 · 24dd9f5 - Move auth route specs to auth/test/routes/ and its setup helper to auth/test/setup.ts.
- [x] 2026-10-20 · 24dd9f5 - Move tickets specs to test/routes/, test/models/ and test/events/listeners/; move setup to test/setup.ts.
- [x] 2026-10-20 · 24dd9f5 - Move orders specs to test/routes/, test/events/listeners/ and test/config.test.ts; move setup to test/setup.ts.
- [x] 2026-10-20 · 24dd9f5 - Move the expiration worker spec to expiration/test/queues/expiration-queue.test.ts.
- [x] 2026-10-20 · 24dd9f5 - Move test-only NATS mocks to test/mocks/ and explicitly wire factories with Node16-compatible dynamic import extensions.
- [x] 2026-10-20 · 24dd9f5 - Retain common/test/, client/test/ and root test/; leave the client's page layout unchanged.
- [x] 2026-10-20 · 24dd9f5 - Rebase imports and update Vitest discovery/setupFiles plus source/test no-emit typecheck coverage. No test helpers/specs/mocks remain under service src/. Production build configuration is out of scope after cancellation.
- [x] 2026-10-20 · c7e0bc1 - Document service paths and add a layout/suite-count regression. Preserve all 20 backend suites and their assertions.
- [x] 2026-10-20 · c7e0bc1 - All backend typechecks/tests and the full root gate pass: auth 12, tickets 23, orders 26, expiration 4, common 9, manifest/Compose 6, client 14 and acceptance 6; total 100 tests with no skipped cases.

## Blockers

None. Plan closed 2026-10-20. Remote CI and real Docker Desktop execution remain evidence limitations rather than claimed successes.
