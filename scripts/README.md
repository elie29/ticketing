# Development Commands

Run commands from the repository root. [Root documentation](../README.md) contains prerequisites, direct Docker/Podman startup and local watch workflows.

- `manage-packages.cjs` dispatches install/update/test/dev/Vitest actions, using WSL for host npm workflows on Windows.
- `compose.cjs` selects `COMPOSE_BIN`, native Windows Docker, Windows WSL/Podman fallback, or Linux Podman/Docker in that order. It forwards arguments without shell evaluation and preserves exit status. `compose.sh` is a compatibility wrapper around this same dispatcher.
- `install.sh` and `update.sh` prepare root tools, then common before consumer packages.
- `dev.sh` supplies shared local defaults, builds/watches common and runs all app watchers.
- `test.sh` runs common/backend typechecks and Vitest suites, then builds the Next client.
- `vitest.sh` runs root acceptance, client and manifest/dispatcher checks with the root configuration.

Use `npm run compose:infra` before `npm run dev`, or use full containers with direct Compose. Do not run both application modes on the same ports. Compose containers are development-only; no production deployment is provided. [VS Code tasks](../.vscode/tasks.json) are optional wrappers around these commands.
