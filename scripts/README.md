# Development Commands

Run commands from the repository root. [Root documentation](../README.md) contains prerequisites, direct Docker/Podman startup and local watch workflows.

- `manage-packages.cjs` dispatches install/update/test/dev/Vitest actions, using WSL for host npm workflows on Windows.
- `compose.cjs` selects `COMPOSE_BIN`, native Windows Docker, Windows WSL/Podman fallback, or Linux Podman/Docker in that order. It forwards arguments without shell evaluation and preserves exit status. `compose.sh` is a compatibility wrapper around this same dispatcher.
- `install.sh` and `update.sh` prepare root tools, then common before consumer packages.
- `dev.sh` loads the root `.env` without overriding exported variables, supplies shared local defaults, builds/watches common and runs all app watchers.
- `test.sh` runs common/backend typechecks and Vitest suites, then builds the client with Vite.
- `vitest.sh` runs root acceptance, client and manifest/dispatcher checks through the `root` and `client` projects of the root [vitest.config.mts](../vitest.config.mts).

Use `npm run compose:infra` before `npm run dev`; it applies the `docker-compose.dev.yaml` overlay so MongoDB, Redis, NATS and Redis Insight listen on `127.0.0.1`. `npm run compose:up` starts the production stack behind nginx on port 80, and `npm run compose:down` stops both modes, including Redis Insight. [VS Code tasks](../.vscode/tasks.json) are optional wrappers around these commands.
