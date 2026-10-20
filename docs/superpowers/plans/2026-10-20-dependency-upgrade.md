# Dependency Upgrade Work Tracker

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 1 - Review and approve upgrade design — 2026-10-20
- [x] Task 2 - Security review and detailed implementation plan — 2026-10-20
- [x] Task 3 - Establish baseline and upgrade common — 2026-10-20
- [x] Task 4 - Upgrade and verify backend consumers — 2026-10-20
- [x] Task 5 - Upgrade and verify frontend — 2026-10-20
- [x] Task 6 - Validate package release, runtime, CI, and documentation — 2026-10-20
- [x] Task 7 - Execute final regression gate — 2026-10-20
- [x] Task 8 - Run all application services in Compose — 2026-10-20
- [x] Task 9 - Add root acceptance tests and remove Axios — 2026-10-20
- [x] Task 10 - Remove legacy cluster deployment — 2026-10-20
- [x] Task 11 - Consume common locally without publication — 2026-10-20
- [x] Task 12 - Locate shared Dockerfile under common — 2026-10-20
- [x] Task 13 - Document local common workflow — 2026-10-20

## Closure

Closed on 2026-10-20 at the user's request to tick all tasks done. Checked boxes indicate administrative closure, not a claim that every implementation or verification step was completed. Previously unchecked steps are explicitly labelled "Closed by user request; not verified" below. Existing executed evidence remains unchanged; this closure is not a production-readiness certification.

Subsequent CI/local-common, Vitest, client and development Compose work resolved the earlier lockfile, Express, backend migration, automatic-expiration and documentation gaps. Historical checklist labels below describe the original closure; the reconciliation below is the current cross-plan status.

## Current Reconciliation

- 2026-10-20 - Node 24, private local common and aligned dependencies/lockfiles are implemented. Vitest replaced the intermediate Jest/SWC setup in 87631d2; Tailwind later replaced Bootstrap in e09ed01; JetStream replaced STAN in eddd5ca/ae99ee6. Earlier version/technology mentions below are historical, not today's required stack.
- 2026-10-20 - The original 84-test migration baseline was superseded by the complete 100-test root gate after external test relocation (24dd9f5/c7e0bc1), plus two separately executed real-broker tests. Shared/backend typechecks and the Next client compilation gate passed; no tests were skipped.
- 2026-10-20 - All six package READMEs, scripts/test support READMEs, default full-stack development Compose, portable engine selection and reusable VS Code tasks are delivered in c7e0bc1/95e3bf3. Exact TicTix branding and course-attribution removal are in b494b13 and received focused browser/source checks.
- 2026-10-20 - Production Docker was explicitly cancelled; no production container/deployment delivery, DNS or TLS work is pending. Do not interpret the existing Next compilation gate as production Docker.
- 2026-10-20 - Infrastructure-only switching, local app startup and frontend proxy HTTP 200 were observed. Common-source content-change recompilation, temporary diagnostic-task cleanup and restoring full containers remain open in [the development Compose plan](2026-10-20-production-jetstream.md). The [client delivery plan](2026-10-20-ticket-order-client.md) is complete.
- 2026-10-20 - This is a documentation reconciliation, not a new test/audit run. Remote GitHub Actions and a real Docker Desktop daemon remain unverified; point-in-time dependency audit results below do not substitute for a fresh security/advisory/load/rollback review. The requested security-review skill was unavailable and is not represented as executed.

## Goal

Upgrade all six packages to latest stable compatible dependencies with required code and runtime migrations, preserving existing functionality and reporting verification gaps honestly.

Implementation follows the existing design with the user's follow-up requirements: keep Node 24, use WSL Podman, add root acceptance tests, and remove Axios in favor of fetch. Work remains in the existing shared checkout; do not create branches, commit, or push.

## Task 1 - Review and Approve Upgrade Design

- [x] 2026-10-20 - Inspect all six manifests, publishing/consumer scripts, build contexts, CI, representative model and test setup, and latest npm metadata.
- [x] 2026-10-20 - Draft docs/superpowers/specs/2026-10-20-dependency-upgrade-design.md.
- [x] 2026-10-20 - Closed by user request; not verified: Run the Superpowers builder check and resolve consequential questions.
- [x] 2026-10-20 - Closed by user request; not verified: Obtain user approval of the written design before implementation.

## Task 2 - Security Review and Detailed Implementation Plan

- [x] 2026-10-20 - Closed by user request; not verified: Locate the requested security-review skill or disclose its absence and perform a documented manual review.
- [x] 2026-10-20 - Closed by user request; not verified: Use superpowers:writing-plans against the approved design and obtain required plan approval.

## Tasks 3-7

### Task 3 - Common

- [x] 2026-10-20 - Upgrade common to Express 5, validator 7, JWT 9, current cookie-session/types, and TypeScript 7 on Node 24. Install audit: zero vulnerabilities.
- [x] 2026-10-20 - Compile common successfully after updating Node16 module resolution, ES2022 target, explicit source root, cookie-session augmentation, and validator field serialization.
- [x] 2026-10-20 - Closed by user request; not verified: Test shared middleware/serialization and build declarations.
- [x] 2026-10-20 - Closed by user request; not verified: Verify local file dependencies in all four consumers; packaging and publication are no longer required (superseded by Task 11).

### Task 4 - Backend Consumers

- [x] 2026-10-20 - Closed by user request; not verified: Upgrade manifests/lockfiles to latest runtime dependencies, Jest 30, @swc/jest, tsx, TypeScript 7, and mongodb-memory-server 11. Remove Express 4's async-error patch, ts-jest, obsolete Bull types, and incompatible concurrency plugin.
- [x] 2026-10-20 - Closed by user request; not verified: Update Express catch-all handlers, Mongoose connection/document/hook APIs, ObjectId constructors, test setup, and validator handling.
- [x] 2026-10-20 - Closed by user request; not verified: Preserve concurrency with native optimisticConcurrency plus explicit per-save version increments. Run the existing ticket concurrency suite first, then all backend typechecks and Jest suites.
- [x] 2026-10-20 - Closed by user request; not verified: Add meaningful expiration tests with deterministic broker/queue boundaries; verify live Redis/NATS in acceptance checks.

### Task 5 - Frontend

- [x] 2026-10-20 - Replace Axios with native fetch in the request helper/hook and handle expected signed-out 401 responses. Pass currentUser from _app rather than repeat the lookup on the home page.
- [x] 2026-10-20 - Remove experimental VM modules; seven routing tests passed with standard imports and mocked fetch boundaries.
- [x] 2026-10-20 - Upgrade to Next 16.4.2, React/React DOM 19.3.1, Bootstrap 5.3.8. Regenerate the incompatible legacy lockfile without forcing peers. npm install audit: zero vulnerabilities. Production webpack build passed on Node 24.
- [x] 2026-10-20 - Closed by user request; not verified: Rerun root acceptance tests against rebuilt upgraded containers.

### Task 6 - Release and Deployment

- [x] 2026-10-20 - Closed by user request; not verified: Validate local common links and reproducible consumer lockfiles instead of publishing; no npm authentication is required for common.
- [x] 2026-10-20 - Closed by user request; not verified: Keep all application images on Node 24, remove temporary legacy OpenSSL flags once modern Next works, and rebuild/run Compose through WSL.
- [x] 2026-10-20 - Closed by user request; not verified: Extend CI and README with actual reproducible install/build/test/acceptance commands; audit all packages and record unresolved advisories.

### Task 7 - Regression Gate

- [x] 2026-10-20 - Closed by user request; not verified: Execute final typechecks, service suites, frontend production build, routing tests, and live acceptance tests.
- [x] 2026-10-20 - Closed by user request; not verified: Review the complete diff for authentication, serialization, persisted versioning, queue compatibility, and rolling-deployment/rollback risks.
- [x] 2026-10-20 - Closed by user request; not verified: Record verdict and exact executed evidence; cap readiness if local dependency builds, infrastructure, or material coverage remains blocked.

## Task 8 - Run All Application Services in Compose

- [x] 2026-10-20 - Inspect existing Compose, application startup variables, Dockerfiles, and frontend API routing.
- [x] 2026-10-20 - Confirm Ubuntu WSL has working rootless Podman 4.9.3 and podman-compose 1.6.0 via a login shell.
- [x] 2026-10-20 - Add focused routing tests before changing frontend behavior.
- [x] 2026-10-20 - Run routing tests red then green: five passed after conditional rewrites and server/browser URL corrections.
- [x] 2026-10-20 - Add all five apps, shared environment, database separation, readiness dependencies, and Node 24 Dockerfiles.
- [x] 2026-10-20 - Configure internal API routing and retain non-Compose defaults.
- [x] 2026-10-20 - Compose config, all five builds, and live startup succeeded. All app containers reported v24.22.0.
- [x] 2026-10-20 - Closed by user request; not verified: Update runnable documentation and record actual verification results and blockers.

## Task 9 - Acceptance and Fetch

- [x] 2026-10-20 - Add root npm run test:acceptance and npm run test:routing commands.
- [x] 2026-10-20 - Execute live acceptance baseline: four passed, one failed (signed-out page SSR embeds the API's expected 401 as an error).
- [x] 2026-10-20 - Fix signed-out SSR handling without changing the API's deliberate unauthenticated 401 contract; frontend production build passed.
- [x] 2026-10-20 - Replace Axios with fetch and remove the dependency and experimental flag; seven routing tests passed.
- [x] 2026-10-20 - Closed by user request; not verified: Rerun live acceptance tests after rebuilding upgraded containers.

## Task 10 - Remove Legacy Cluster Deployment

- [x] 2026-10-20 - Confirm only the existing Compose version-field removal was user-edited; no tracked cluster manifest modifications to preserve.
- [x] 2026-10-20 - Remove the legacy deployment config and all twelve Kubernetes deployment/ingress manifests, retaining Compose and Dockerfiles.
- [x] 2026-10-20 - Update architecture/run/test documentation for Compose and replace the obsolete ingress-domain fallback with localhost in the client and its test.
- [x] 2026-10-20 - Closed by user request; not verified: Run routing tests, Compose config validation, and a tracked-source scan for stale deployment references.

## Task 11 - Consume Common Locally Without Publication

- [x] 2026-10-20 - Mark common private and remove its publishing script.
- [x] 2026-10-20 - Declare file:../common in auth, tickets, orders, and expiration instead of a registry version.
- [x] 2026-10-20 - Add a one-shot common builder to Compose, shared build-output volume, and service_completed_successfully dependencies in all four consumers.
- [x] 2026-10-20 - Add a shared multistage Dockerfile with repository-root context and a root .dockerignore excluding generated dependencies/builds and environment files.
- [x] 2026-10-20 - Regenerate common/auth lockfiles and verify auth resolves the checkout's local common/build entrypoint.
- [x] 2026-10-20 - Closed by user request; not verified: Regenerate the other three consumer lockfiles, and verify every clean install resolves local common.
- [x] 2026-10-20 - Update README for private local common, build-common-first local development, Compose one-shot build/output sharing, common/Dockerfile targets, and remaining integration gaps.
- [x] 2026-10-20 - Closed by user request; not verified: Update install/update scripts, CI, and design for build-common-first local development; do not retain registry publication as a required step.
- [x] 2026-10-20 - Closed by user request; not verified: Build/start all consumers and rerun acceptance against the new local-common Compose stack. The previously running containers still use the earlier images until rebuilt/recreated.

## Task 12 - Locate Shared Dockerfile Under Common

- [x] 2026-10-20 - Move the shared multistage Dockerfile from the repository root to common/Dockerfile without changing its build stages.
- [x] 2026-10-20 - Set dockerfile: common/Dockerfile explicitly on common and all four backend Compose builds, retaining repository-root context.
- [x] 2026-10-20 - Validate podman compose config and successfully build the common target in WSL using Node 24. npm ci reported zero vulnerabilities; TypeScript compilation succeeded.

## Task 13 - Document Local Common Workflow

- [x] 2026-10-20 - Compare README history/diff against current common/consumer manifests, Dockerfile, Compose wiring, root scripts, and CI.
- [x] 2026-10-20 - Update architecture and service table to describe local common instead of a published package, and document build order, one-shot container behavior, build volume, Dockerfile targets, and local development commands.
- [x] 2026-10-20 - Preserve the user's root npm test command and document incomplete consumer lockfile/scripts/CI/full-stack verification honestly. Correct the workflow's documented command to npm ci.
- [x] 2026-10-20 - git diff --check -- readme.md passed; editor diagnostics reported no errors. No application code changed for this documentation request.

## Historical Baseline Evidence

- Worktree was clean before investigation (git status --short produced no entries).
- Node --version: v24.14.1.
- Registry metadata was fetched successfully using Node's built-in fetch without installing dependencies.
- At the initial baseline, no package had node_modules and tests had not yet run. Subsequent executed gates are recorded above and in later plans.
- Latest registry metadata: Express 5.3.0, Mongoose 9.11.2, TypeScript 7.0.2, Jest 30.5.2, Next 16.4.2, React 19.3.1, Bull 4.16.5.
- ts-jest 29.4.15 requires TypeScript >=4.3 <7; express-async-errors 3.1.1 requires Express ^4.16.2. Both incompatibilities require a supported migration, not forced peer resolution.
- NATS Streaming's latest npm client remains 0.3.2; @types/bull is deprecated because Bull includes types.
- rg is unavailable in the terminal; use the workspace search tools or git grep.
- WSL commands must run in a login shell to find ~/.local/bin/podman-compose. Git Bash also needs MSYS_NO_PATHCONV=1 to preserve Linux paths.
- Working container command prefix: MSYS_NO_PATHCONV=1 wsl.exe --distribution Ubuntu --cd /mnt/c/path/to/ticketing --exec /bin/bash -lic.
- WSL npm whoami failed with ENEEDAUTH; publishing has not occurred.
- Current client lockfile lacked @popperjs/core; npm install --package-lock-only repaired it before the successful client build.
- Latest relocation verification: podman compose config and podman compose build common both exited successfully. Built image: localhost/ticketing_common:latest.

## Decisions

- 2026-10-20 - User requested all plans be checked and updated. Preserve this administrative closure and original evidence; add the later verified outcomes and link the single remaining active runtime/cleanup task rather than relabel unexecuted historical gates as passing.
- 2026-10-20 - Final reconciliation at the user's request: clear resolved installation/publication/Express/migration blockers. Common is private/local and Vitest supersedes Jest/SWC. Later plans record the passing 84-test evidence; retain original historical records and unverified release/security caveats.
- 2026-10-20 - User requested ticking all tasks done. Close the tracker and all checklist entries, preserving unexecuted work as explicitly unverified rather than claiming it passed.
- 2026-10-20 - Before closure, the install/update scripts were made independent of the caller's working directory and switched to building local common first. The initial shell validation exposed CRLF line endings; LF normalization and a scripts/*.sh Git attribute fixed them. Installer syntax validation and the update script both passed from /tmp in WSL, including a successful common build. CI and remaining consumer integration were not completed by that check.
- 2026-10-20 - User approved latest stable major upgrades, including required code and Node/Docker migrations ("yes everything").
- 2026-10-20 - Existing services consume published common, not its local source; validate an npm-packed artifact before publishing a compatible new release and refreshing consumers.
- 2026-10-20 - Follow the required Superpowers written-design approval gate before installing dependencies or modifying application code.
- 2026-10-20 - Preserve the application's behavior and storage/event contracts; do not substitute a transport migration, frontend redesign, or unapproved destructive data migration for a dependency upgrade.
- 2026-10-20 - Do not use common's pub script because it stages and commits changes; no commits or pushes have been requested.
- 2026-10-20 - User requested a focused Compose follow-up: run all application services inside Compose. Complete this task without performing the still-pending dependency migrations.
- 2026-10-20 - User directed container validation through WSL/Podman. Ubuntu Podman works, but podman compose reports no provider; try a temporary non-root provider rather than privileged installation.
- 2026-10-20 - Preserve the user's existing removal of the obsolete Compose version field.
- 2026-10-20 - Reuse Next.js API rewrites for Compose routing rather than add a separate reverse-proxy service; preserve existing production routing when Compose variables are absent.
- 2026-10-20 - User reaffirmed upgrading all dependencies now with Node 24. Proceed with the documented compatibility migrations and local verification; do not treat the pending registry authentication as permission to skip testing or publish unverified artifacts.
- 2026-10-20 - User accepted fetch and requested removing Axios, and requested root acceptance tests with a dedicated command. Apply both requirements as part of the frontend migration.
- 2026-10-20 - Use Jest 30 with SWC and separate TypeScript 7 compilation because ts-jest's published peer range excludes TypeScript 7. Use tsx instead of the obsolete ts-node-dev runtime.
- 2026-10-20 - Common 2.0.0 is the proposed release because public Express types change major. Check version availability before publishing.
- 2026-10-20 - No security-review skill is exposed in the available skill list. Perform an explicit manual review of cookies/JWT, validation serialization, error handling, artifact contents, and dependency advisories; do not claim the unavailable skill ran.
- 2026-10-20 - User requested removing Skaffold and all related assets; remove its Kubernetes/ingress deployment files and documentation, keep Compose/Podman as the sole supported deployment workflow, and remove the obsolete ingress-domain API fallback.
- 2026-10-20 - User replaced the publication requirement with local common consumption. Keep separate packages with file:../common dependencies, mark common private, and build it locally/in Compose. This supersedes earlier npm publishing/version-availability decisions and removes npm authentication as a blocker.
- 2026-10-20 - User requested the Dockerfile be inside common like the other package-owned build files. Move the shared common/service stages into common/Dockerfile, retain root build context for sibling access, and reference that path explicitly in Compose. Validation passed.
- 2026-10-20 - User requested updating the README accordingly. Document the implemented local-library architecture and Node 24/WSL workflow, but do not imply unfinished consumer/CI integration or the rebuilt full stack has passed verification.

## Blockers

None owned by this closed historical tracker. Earlier local-consumer lockfile/script/backend issues are resolved. Remaining source-watch proof and runtime/task cleanup belong to Task 4 of the development Compose plan. Remote execution and independent security/load/rollback certification are not claimed; production Docker is cancelled.
