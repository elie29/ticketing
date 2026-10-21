# Native Root Launchers Design

## Intent

On Windows, the root npm commands do not run where they are launched. `scripts/manage-packages.cjs` converts the repository path with `wslpath` and re-runs `install`, `update`, `test`, `dev` and `vitest` inside WSL (`/mnt/c/...`), with WSL's own Node. `scripts/compose.cjs` falls back to Podman inside WSL when Docker is not on the Windows PATH. This surprised the user: `npm install` reported `EBADENGINE` against WSL's Node v20.11.1 although the shell ran Node v24.13.0.

The user's rule: **a root command runs in the shell it was launched from, from any shell, with the tools found there. Nothing checks for WSL. If a required tool is missing, fail with an error.**

## Goals

- Every root npm command (`install`, `update`, `dev`, `test`, `test:all`, `test:manifests`, `test:services`, `test:routing`, `test:acceptance`, `compose:*`) works when launched from PowerShell, cmd, Git Bash, a WSL terminal, Linux or macOS, using that environment's Node and npm.
- No WSL detection, `wsl.exe`, `wslpath`, `/mnt` conversion or `WSLENV` handling anywhere in `scripts/`.
- Compose engine selection is the same on every platform:
  1. `docker` on PATH → `docker compose …`
  2. otherwise `podman` on PATH → `podman compose …`
  3. otherwise exit non-zero with an error naming both tools.
- The selected engine is still printed, arguments are still forwarded without shell evaluation, Compose runs with the repository root as working directory, and the child's exit status is still propagated.
- Command names, action behaviour (which packages are installed/updated/tested, in which order, which Compose files and services each `compose:*` action uses, `ORDER_EXPIRATION_SECONDS=15` for acceptance, the dev environment defaults and `.env` filling rules) stay as they are.

## Non-goals

- No change to package contents, dependencies, Compose files, Dockerfiles or CI jobs.
- No renaming of npm scripts.

## Anti-goals

- Any path that silently ends up in WSL — including Windows' `C:\Windows\system32\bash.exe`, which is WSL's bash and is what PowerShell resolves `bash` to on this machine.
- A fallback the user did not ask for: no `COMPOSE_BIN` override, no Docker-then-Podman retry after Docker fails, no auto-install.
- Weakened or dropped tests: argument forwarding, working directory, exit-status propagation and per-action Compose calls stay covered.

## Decided by the user

- Run where launched; no WSL check (2026-10-21).
- Docker if present, else Podman, else error — on every platform. This replaces the current Linux order (Podman preferred) (2026-10-21).
- Remove the `COMPOSE_BIN` override (2026-10-21).
- Must work from any shell, not only Git Bash (2026-10-21).
- The user tests on Windows with Docker, on macOS and inside WSL; those runs stay out of the plan (2026-10-21).
- Design approved for implementation (2026-10-21).

## Assistant's calls

- **Launchers become Node (`.cjs`), not bash.** Required by "any shell": from PowerShell, `bash` is WSL's bash and `env` does not exist. `install.sh`, `update.sh`, `test.sh`, `dev.sh`, `vitest.sh` are ported to Node and the `.sh` files, including the `compose.sh` compatibility wrapper, are deleted.
- `manage-packages.cjs` stays the single entry point and maps each action to a handler (Command pattern); each handler lives in its own module (single responsibility).
- `dev` sets per-process environment through Node (for example `concurrently`'s programmatic API or `spawn` `env`), not through `env VAR=… cmd` strings.
- Compose engine detection and process spawning are injected into the selector/runner so tests can stub them without an environment override (dependency inversion). This replaces the tests' use of `COMPOSE_BIN`.
- Child processes are spawned without a shell where possible; where Windows requires one for `npm.cmd`, arguments must not be built by string interpolation of caller input.
- Each Node launcher action (`install`, `update`, `test`, `dev`, `vitest`) gets its own tests with an injected command runner: package order, `ci`/`update` and `--ignore-scripts` flags, where caller options are forwarded (for `test`, only to each service's `test:ci`), `.env` rules and per-service `dev` environment.
- npm is run as `node <npm_execpath> …` (the CLI that launched the command) so no shell is needed for `npm.cmd`; if `npm_execpath` is missing, the launcher exits with an error asking to run it through npm. One end-to-end test runs `manage-packages.cjs` as a real child process with `npm_execpath` pointing at a stub script, proving real argument passing (paths with spaces), working directory and exit status. Compose forwarding is covered with an injected spawn stub.
- Native runs of the backend service suites (`npm test` / `test:services`) on Windows are part of the user's own platform testing; package code is not changed by this work. A native failure there is recorded as a blocker, not fixed inside this change.
- Historical specs and plans stay as written; `2026-10-20-dependency-upgrade-design.md`, `2026-10-20-production-jetstream-design.md` and `2026-10-21-backend-folder-design.md` get a one-line "superseded by this spec" note on their WSL statements.

## What changes

- `scripts/manage-packages.cjs`: remove the `win32` WSL branch; dispatch to Node handlers.
- New Node handlers replacing `scripts/{install,update,test,dev,vitest}.sh`; delete those files and `scripts/compose.sh`.
- `scripts/compose.cjs`: new selection order, no `COMPOSE_BIN`, no WSL, error when neither engine exists.
- New `test/launchers.test.cjs` for the Node actions, added to the root `test:manifests` script.
- `test/compose.test.cjs`: cover Docker-present, Podman-only, neither (error, non-zero), argument/cwd/exit-status forwarding and per-action calls, using injected stubs.
- Docs: root `README.md` (Compose shortcut, host npm workflows, local development, testing sections), `scripts/README.md`, `backend/common/README.md` ("From WSL/Linux" → any shell).
- After switching, existing `node_modules` were installed by WSL's Linux npm and contain Linux-only native builds (for example `@rolldown`); the README says to reinstall with `npm install` from the shell you will work in.

## Verification

- Automated: the root Vitest project passes (`npm run test:manifests`), including the new launcher tests and the Compose selection cases with stubbed engines (Docker present, Podman only, neither); `npm run test:routing` still passes.
- `grep -ri wsl scripts/` returns nothing.
- Manual platform runs — Windows with Docker, macOS, and inside WSL — are done by the user and are **not part of the implementation plan** (decided 2026-10-21).

## Left to the builder

- Module names and file layout under `scripts/`.
- How `.env` lines are parsed in Node, as long as the current rules hold (only `NAME=value` lines with a valid name; values already exported in the shell win).

## Constraints

- Node 24 (`>=24 <25`), Vitest 5, existing root `vitest.config.mts` projects.
- Never `git commit` or `git push` (user rule).
