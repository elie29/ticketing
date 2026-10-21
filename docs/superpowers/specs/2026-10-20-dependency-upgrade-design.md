# Repository Dependency Upgrade Design

## Intent

Upgrade dependencies across common, auth, tickets, orders, expiration, and client to current stable, mutually compatible releases. Include required source, Node.js, container-build, lockfile, CI, and documentation changes. Preserve existing functionality and verify it through execution; do not promise an absence of regressions without evidence.

The user approved latest stable major upgrades and required code/Node/Docker migrations on 2026-10-20, then explicitly requested private local common consumption, full/partial Compose modes, and Vitest. These later instructions supersede the initial publishing proposal. The implementation and its plans are closed; verification evidence and limits are recorded below.

Subsequent production/JetStream and portable Compose requirements are specified in [2026-10-20-production-jetstream-design.md](2026-10-20-production-jetstream-design.md). That specification supersedes the historical infrastructure-only default, app-profile requirement, and unconditional Windows WSL relay for Compose described below; those changes are implementation requirements, not claims of completed work.

## Existing Boundaries

- Each package has its own manifest and lockfile; there is no root npm workspace.
- Auth, tickets, orders, and expiration use file:../common; common is private and is not published.
- Backend/common builds use repository-root context and the shared multistage common/Dockerfile. The client retains its own build context/Dockerfile.
- Common exports Express middleware, errors, event contracts, and NATS Streaming abstractions. Changes to its public types affect all four consumers.
- CI includes all four backends, common, client production build, manifest/routing checks, and a real Compose acceptance job. Root Vitest tooling is installed without recursive install lifecycle scripts.
- Package engines, application images, and CI use Node 24. Root launchers use WSL from Windows to avoid mixing platform-specific dependencies.

> Superseded on 2026-10-21 by [native launchers](2026-10-21-native-launchers-design.md): root commands run natively, no WSL.

## Compatibility Contract

Preserve route paths, status codes, response bodies, validation error field names, password hashing behavior, JWT claims, cookie-session behavior, and authentication requirements. Preserve stored document fields and JSON serialization, including id and version handling.

Preserve NATS subjects, event payloads, durable subscriptions, acknowledgements, ordering/version checks, and ticket reservation/release behavior. Preserve Bull queue identity, delayed expiration semantics, and existing Redis job compatibility. Preserve the client's existing Pages Router, navigation, server-side current-user lookup, sign-in, sign-up, and sign-out flows; no visual redesign or feature additions.

Do not replace NATS Streaming with JetStream as part of a dependency upgrade. Its latest npm client is still 0.3.2. Do not silently rewrite persisted MongoDB or Redis data or upgrade backing-service images across incompatible data formats. Any such necessity must be presented separately before changing it.

## Proposed Approach

1. Establish baseline builds/tests using existing manifests and lockfiles where executable. Record pre-existing failures separately; never weaken tests to turn them green.
2. Build common before its four consumers. Preserve separate packages/lockfiles and use private local file dependencies rather than registry publication.
3. Use the Node 24 LTS major consistently for development requirements, application Dockerfiles, and CI. Choose a verified patch/image at implementation time; do not assume the locally installed patch is current.
4. Move to Express 5 and its matching types. Remove express-async-errors, whose peer dependency only supports Express 4. Verify rejected async handlers still reach error middleware and preserve response behavior.
5. Adapt express-validator's newer discriminated error types while preserving the existing serialized validation error format.
6. Upgrade Mongoose and mongodb-memory-server together; adapt document types, connection setup, ObjectId construction, and test lifecycle to their supported APIs. Existing optimistic concurrency tests must continue to reject stale writes and increment versions on every save, including saves with no field changes. Retain or replace the existing plugin only after verifying those exact semantics; native optimisticConcurrency alone must not be assumed equivalent.
7. Upgrade Bull within the Bull package, not to BullMQ. Remove obsolete external Bull types when the package supplies its own. Verify job completion waits for publishing and delayed jobs still behave correctly.
8. Upgrade Next.js and React together while retaining the Pages Router. Add reproducible production build and startup verification, and browser checks for the existing authentication pages.
9. Use Vitest 5 for all automated suites, native TypeScript transformation, and separate TypeScript 7 typechecks. Preserve test assertions and isolated database setup. Jest/SWC/node:test were replaced; no experimental VM-module flags are required.
10. Keep root and all six package lockfiles aligned and use npm ci in CI/image builds. Audit findings are not automatically resolved by passing tests; do not blindly apply npm audit fix --force.

Exact release versions and replacement tooling are implementation choices grounded in registry metadata, official migration documentation, and executable checks. No new application architecture or design pattern is required merely to update dependencies.

## Common and Development Modes

Common is private, with no publish script or npm authentication requirement. Install/build it before consumers; declarations and JavaScript are generated in common/build. Compose's one-shot common service populates a shared output volume before backends start. Clean the volume's contents, not the mount directory itself.

Default Compose services are MongoDB, Redis, and NATS. The app profile adds common and applications; tools adds mongo-express. Root compose:up, compose:infra, and compose:down support full and partial modes. Root dev builds/watches common and starts common-aware backend watchers plus Next dev with localhost endpoints. Runtime switching/watch verification remains deferred; configuration/profile selection and full-container behavior were verified.

The normal order lifetime remains 900 seconds. A validated ORDER_EXPIRATION_SECONDS override lets compose:acceptance and CI use 15 seconds. Acceptance observes real Redis/Bull/NATS-driven cancellation, ticket release, and subsequent reservation without manually cancelling the expiring order.

Do not commit, create branches, publish, or push on the user's behalf. None is required for local common consumption.

## Verification Gates

- Baseline and upgraded results recorded separately for all executable existing suites.
- Common build, local-link/lockfile validation, and typechecks for every TypeScript service.
- Existing auth, tickets, and orders suites, including concurrency, event-ordering, reservation/release, validation, and authentication checks.
- Focused regression tests for any changed behavior not pinned by existing tests; do not delete, skip, or weaken existing tests.
- Expiration typecheck and meaningful listener/queue checks, using actual Redis/NATS where necessary. Mocks alone do not verify broker interoperability.
- Frontend production build and browser checks of existing pages on desktop and mobile, including errors and authentication redirects where reachable.
- Clean npm ci validation against all final lockfiles, dependency compatibility checks, and npm security audits.
- Build application containers if Docker is available. Verify database, Redis, and NATS integration if the required services can run. Missing infrastructure is a verification gap, not a passing result.
- Update CI to cover the packages affected by shared changes and the checks established above; update the README to match runnable commands and requirements.
- Final regression-gate verdict with commands, outcomes, remaining findings, deployment/rollback considerations, and explicitly unverified behavior. No clean SHIP verdict unless the relevant gates are actually satisfied.

## Security Review

Preserve authentication, JWT/cookie behavior, async error handling, validation serialization, and container/runtime support. Passing tests do not certify security or resolve every dependency advisory. The originally requested security-review skill was not available; no completed independent security review is claimed.

## Completion Evidence and Limits

The user directed implementation and approved the Vitest migration. Implementation is recorded through 87631d2; the final local CI=1 npm test run passed 84 tests, all shared/backend typechecks, and the frontend production build. A focused independent migration review reported no material findings. All seven manifests/lockfiles passed closure checks.

Plans are closed at the user's request with no active blockers. Hybrid watched-mode runtime checks, latest GitHub-hosted Vitest execution, browser-level desktop/mobile interactions, load/performance, and security/release certification remain explicitly unverified, not silently marked as passed.
