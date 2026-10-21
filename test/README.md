# Root Verification

All automated suites use Vitest. Install dependencies with the root installer, then prepare the real stack with `npm run compose:acceptance` before running `npm test`.

- [package-manifests.test.cjs](package-manifests.test.cjs): Node/private-package/dependency alignment, embedded local common lock metadata, script consistency and external backend test layout.
- [compose.test.cjs](compose.test.cjs): engine precedence, platform branches and non-destructive override forwarding/error propagation.
- [acceptance/ticketing.test.cjs](acceptance/ticketing.test.cjs): rendered pages, cookies, authorization, validation, real reservation/cancellation and automatic expiration/re-reservation through MongoDB, Redis/Bull and JetStream.

Acceptance creates unique test accounts/tickets. Use only a development/test stack; the suite targets `ACCEPTANCE_BASE_URL` when set, otherwise `http://localhost:${HTTP_PORT}`, otherwise `http://localhost`; `npm run test:acceptance` reads `HTTP_PORT` from the root `.env` when the shell has not set it. The short test lifetime is 15 seconds; ordinary development is 900 seconds. Restore orders without the override afterward.

Service unit tests live under each package's `test/` folder, not `src/`. Client tests are under [client/test](../client/test). Shared unit contracts and the separate isolated broker suite are documented in [backend/common/README.md](../backend/common/README.md). Real broker tests are an explicit additional gate, not silently skipped cases in ordinary unit runs.
