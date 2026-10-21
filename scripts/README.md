# Development Commands

Run commands from the repository root. [Root documentation](../README.md) contains prerequisites, direct Docker/Podman startup and local watch workflows.

Every command runs natively in the shell it is launched from (any shell, any OS) with that environment's Node and npm. The launchers are plain Node, so no bash is needed and nothing is relayed to another environment. npm runs as `node <npm_execpath>`, the npm that launched the command, so run them through npm (`npm run …`).

- `manage-packages.cjs` maps each action name to its module in `actions/` and exits with its status.
- `actions/install.cjs` and `actions/update.cjs` prepare root tools, then common before consumer packages (`lib/packages.cjs`).
- `actions/dev.cjs` loads the root `.env` without overriding variables already set in the shell (`lib/env-file.cjs`), supplies shared local defaults, builds/watches common and runs all app watchers with `concurrently`.
- `actions/test.cjs` runs common/backend typechecks and Vitest suites, then lints and builds the client with Vite.
- `actions/vitest.cjs` runs root acceptance, client and manifest/launcher checks through the `root` and `client` projects of the root [vitest.config.mts](../vitest.config.mts).
- `compose.cjs` uses `docker compose` when `docker` is on PATH, otherwise `podman compose`, otherwise stops with an error. It forwards arguments without shell evaluation and preserves exit status.
- `lib/process.cjs` holds the shared child-process helpers: no shell, first failure stops the sequence.

Use `npm run compose:infra` before `npm run dev`; it applies the `docker-compose.dev.yaml` overlay so MongoDB, Redis, NATS, Redis Insight and NUI listen on `127.0.0.1`. `npm run compose:up` starts the full stack behind nginx on port 80 with the same overlay (infra ports, Redis Insight and NUI), `npm run compose:acceptance` starts the plain production stack, and `npm run compose:down` stops both modes, including Redis Insight and NUI.
