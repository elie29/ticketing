# Native Root Launchers Implementation Plan

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-21

## Tasks

- [x] Task 1 — Process helpers: native npm runner, command lookup, child exit status — 2026-10-21 · uncommitted
- [x] Task 2 — Compose: Docker, else Podman, else error; no override, no WSL — 2026-10-21 · uncommitted
- [x] Task 3 — `install`, `update`, `test`, `vitest` actions in Node; dispatcher without WSL — 2026-10-21 · uncommitted
- [x] Task 4 — `dev` action in Node (`.env` filling, per-service environment) — 2026-10-21 · uncommitted
- [x] Task 5 — Docs, superseded notes and final gate — 2026-10-21 · uncommitted
- [x] Task 6 — Review minors 1–4: npm_execpath must be npm, signal exit codes, testable `dev`, superseded note placement — 2026-10-21

### Task 6: Review minors 1–4

- [x] `createNpm` accepts only an `npm_execpath` named `npm-cli.js`, otherwise it throws `… is not npm: run this command through npm …`. Test: `createNpm refuses another package manager`. The end-to-end stub is now named `npm-cli.js`.
- [x] `exitStatus(result)` in `scripts/lib/process.cjs` maps a signal to 128 + its number. Test: `exitStatus reports signals as 128 + their number, like a shell`.
- [x] `dev` takes `readFile` and `loadConcurrently` from the context. Tests: `dev stops before the watchers when the common build fails`, `dev starts every watcher from the root with the merged environment and kill-others`, `dev returns the failing watcher exit code, or 1 when none is known`, `dev works without a root .env`.
- [x] The superseded note in `2026-10-21-backend-folder-design.md` moved below the Constraints list.
- [x] Gate: `npm run test:manifests` → 30 passed; `npm run test:routing` → 23 passed; `grep -ri wsl scripts/` is empty.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every root npm command runs in the shell it was launched from (any shell, any OS) with that environment's Node, npm and Docker/Podman — no WSL anywhere.

**Architecture:** `scripts/manage-packages.cjs` stays the single entry point and maps each action name to a handler module (Command pattern). Handlers receive their collaborators — an npm runner, a process runner, a command lookup — as arguments (dependency inversion), so tests inject stubs. npm runs as `node <npm_execpath> …` and other children with `spawnSync` without a shell, so no shell quoting and no `npm.cmd` problem on Windows.

**Tech Stack:** Node 24 CommonJS, `node:child_process`, `concurrently` ^10 (root devDependency), Vitest 5 root project.

**Spec:** `docs/superpowers/specs/2026-10-21-native-launchers-design.md`

## Global Constraints

- Node `>=24 <25`; scripts are CommonJS `.cjs`, matching existing `scripts/*.cjs`.
- No `wsl`, `wsl.exe`, `wslpath`, `/mnt`, `WSLENV` or `COMPOSE_BIN` in `scripts/` when done.
- No `bash`, `sh`, `env` or `shell: true` for running children; arguments are arrays, never interpolated strings. The only exception is `concurrently`'s own command strings in `dev`, which contain no caller input.
- Compose order on every platform: `docker` on PATH → `docker compose`; else `podman` on PATH → `podman compose`; else non-zero exit with an error naming both.
- Command names, package order, flags, Compose files/services per action, `ORDER_EXPIRATION_SECONDS=15` for acceptance and dev defaults are unchanged.
- No changes to package contents, Compose files, Dockerfiles or CI.
- Never `git commit` or `git push`: each task ends with changes left in the working tree for the owner.
- Manual platform runs (Windows + Docker, macOS, WSL) are the owner's and are not steps of this plan.

## Review Focus

- **Repository path with spaces** (for example `C:\Users\Jane Doe\ticketing`): every child receives the path unchanged as one argument. Pinned by the end-to-end test in Task 1.
- **Caller options** (`npm run install -- --prefer-offline`): forwarded exactly where the bash scripts forwarded `"$@"`, nowhere else. Pinned in Task 3.
- **A failing step** (one `npm ci` exits 1): later steps do not run, and that exit status is the launcher's exit status (bash `set -e`). Pinned in Tasks 1 and 3.
- **Launched without npm** (`node scripts/manage-packages.cjs install`, so no `npm_execpath`): clear error, non-zero exit, nothing spawned. Pinned in Task 1.
- **A Windows `.env` with CRLF line endings, or a value containing `=`**: names and values come out without `\r`, and the value keeps everything after the first `=`. Pinned in Task 4.

---

### Task 1: Process helpers

**Files:**
- Create: `scripts/lib/process.cjs`
- Create: `test/launchers.test.cjs`
- Modify: `package.json` (`test:manifests` adds `test/launchers.test.cjs`)

**Interfaces:**
- Produces, from `scripts/lib/process.cjs`:
  - `run(command: string, args: string[], options?: { cwd?: string, env?: object }) => number`: `spawnSync` with `stdio: 'inherit'` and no shell. It returns the child's status, `130` on `SIGINT`, or `1` with the error printed when the spawn fails.
  - `createNpm({ env = process.env, execPath = process.execPath, run } = {}) => (args: string[], options?) => number`. It throws `Error('npm_execpath is not set: run this command through npm, for example "npm run install".')` when `env.npm_execpath` is missing. Otherwise it calls `run(execPath, [env.npm_execpath, ...args], options)`.
  - `hasCommand(name: string, env = process.env, platform = process.platform) => boolean`: moved from `compose.cjs` unchanged in behaviour (PATH × PATHEXT on win32).
  - `runSteps(steps: Array<() => number>) => number`: runs the steps in order and returns the first non-zero status, or `0`.

- [ ] **Step 0: Restore root dependencies natively** (the root `node_modules` was emptied by a WSL `npm ci` on 2026-10-21)

Run: `npm ci --ignore-scripts` (repository root, from Git Bash or PowerShell). `--ignore-scripts` skips the WSL `install` hook that is still in place.
Expected: `node_modules/vitest/vitest.mjs` and `node_modules/concurrently/package.json` exist.

- [ ] **Step 1: Write failing tests in `test/launchers.test.cjs`**

- `createNpm runs the launching npm CLI through node`: with `env: { npm_execpath: '/x/npm-cli.js' }`, `execPath: '/node'` and a recording `run`, `npm(['ci'], { cwd: 'C:/a b' })` records `['/node', ['/x/npm-cli.js', 'ci'], { cwd: 'C:/a b' }]`.
- `createNpm refuses to run outside npm`: with `env: {}`, `createNpm(...)` throws `/npm_execpath is not set/`.
- `runSteps stops at the first failure`: steps return `0, 7, 0`; the result is `7` and the third step is never called.
- `manage-packages forwards real arguments, cwd and exit status end to end`: create a temp directory whose name contains a space, holding `stub npm.cjs`. The stub appends `{ args, cwd }` as JSON to a log, and exits `23` when `args` include `--fail`. Spawn `node scripts/manage-packages.cjs install --fail 'path with spaces.env'` with `cwd` set to the temp dir and `npm_execpath` set to the stub. Assert exit status `23`, exactly one logged call, args `['--prefix', root, 'ci', '--ignore-scripts', '--fail', 'path with spaces.env']`, and `cwd` equal to the launcher's own working directory. The `--prefix` argument carries the location.
- `manage-packages without npm_execpath exits non-zero with the npm error`: the same spawn with `npm_execpath` deleted from the environment gives a non-zero status, stderr matching `/npm_execpath is not set/`, and no log file.

The two end-to-end tests stay red until Task 3. Note that in Step 2.

- [ ] **Step 2: Run them to see them fail**

Run: `node node_modules/vitest/vitest.mjs run --project root test/launchers.test.cjs`
Expected: FAIL, `Cannot find module '../scripts/lib/process.cjs'`.

- [ ] **Step 3: Implement `scripts/lib/process.cjs`** with the four exports above. Move `hasCommand` out of `compose.cjs` (keep `compose.cjs` importing it).

- [ ] **Step 4: Run the unit tests**

Run: `node node_modules/vitest/vitest.mjs run --project root test/launchers.test.cjs -t "createNpm|runSteps"`
Expected: PASS (3 tests). The two end-to-end tests still fail until Task 3.

- [ ] **Step 5: Add `test/launchers.test.cjs` to the root `test:manifests` script** after `test/compose.test.cjs`.

- [ ] **Step 6: Leave the changes in the working tree for the owner to commit**, then update this plan.

### Task 2: Compose selection

**Files:**
- Modify: `scripts/compose.cjs`
- Modify: `test/compose.test.cjs` (rewrite)

**Interfaces:**
- Consumes: `hasCommand`, `run` from `scripts/lib/process.cjs`.
- Produces:
  - `selectEngine(available: (name) => boolean) => { command: 'docker' | 'podman', label: string }`. It throws `Error('Neither docker nor podman was found on PATH. Install one of them to use the compose commands.')` when neither is available.
  - `runCompose(options: string[], root: string, { available = hasCommand, run: runner = run, log = console.log } = {}) => number`. It prints `Compose engine: <label>` and calls `runner(engine.command, ['compose', ...args], { cwd: root, env })`. Per-action argument lists are exactly as today. `env` carries `ORDER_EXPIRATION_SECONDS: '15'` for `acceptance` only.

- [ ] **Step 1: Rewrite `test/compose.test.cjs`** with these tests:
  - `prefers docker when both are present`: `selectEngine(() => true).command === 'docker'`.
  - `uses podman when docker is absent`: `selectEngine(name => name === 'podman').command === 'podman'`.
  - `fails when neither engine is present`: `selectEngine(() => false)` throws `/Neither docker nor podman/`. The same case through `runCompose` returns non-zero, prints the error, and the runner is never called.
  - `forwards arguments, cwd and exit status`: a stub runner returns `23`. `runCompose(['config', '--env-file', 'path with spaces.env'], root, …)` returns `23` and the runner received `('docker', ['compose', 'config', '--env-file', 'path with spaces.env'], { cwd: root, … })`.
  - `actions use the dev overlay, except acceptance on the plain prod stack`: the same expected argument lists as the current test (`up`, `infra` and `down` use the dev overlay since cf00824), with `'compose'` as their first element, for `up`, `acceptance`, `infra` and `down`. For `acceptance`, the runner's `env.ORDER_EXPIRATION_SECONDS === '15'`.
  - `stops infra and acceptance after a failing first call`: the runner returns `1` on the first call, so there is exactly one call and the result is `1`.

- [ ] **Step 2: Run them to see them fail**

Run: `node node_modules/vitest/vitest.mjs run --project root test/compose.test.cjs`
Expected: FAIL (the old signature returns `wsl.exe` or uses `COMPOSE_BIN`).

- [ ] **Step 3: Implement the new `selectEngine` and `runCompose`.** Remove `COMPOSE_BIN`, the `wsl.exe` branch, `WSLENV` and the platform parameter. `runCompose` catches the selection error, prints `error.message` to stderr and returns `1`.

- [ ] **Step 4: Run them to see them pass**

Run: same command. Expected: PASS (6 tests).

- [ ] **Step 5: Leave the changes for the owner to commit**, then update this plan.

### Task 3: `install`, `update`, `test`, `vitest` actions and dispatcher

**Files:**
- Create: `scripts/actions/install.cjs`, `scripts/actions/update.cjs`, `scripts/actions/test.cjs`, `scripts/actions/vitest.cjs`
- Modify: `scripts/manage-packages.cjs` (no WSL branch; action map)
- Delete: `scripts/install.sh`, `scripts/update.sh`, `scripts/test.sh`, `scripts/vitest.sh`
- Test: `test/launchers.test.cjs`

**Interfaces:**
- Consumes: `createNpm`, `run`, `runSteps` (Task 1); `runCompose` (Task 2).
- Produces: each action module exports `(context: { root: string, options: string[], npm, run, log }) => number`. `manage-packages.cjs` builds the context once (`npm` is created lazily, so `compose` and `vitest` never need `npm_execpath`), looks up `actions[name]`, and runs `process.exit(status)`. Unknown action: keep today's message `Expected install, update, test, dev, compose, or vitest.` and exit `1`. A thrown `Error` is printed to stderr and the exit is `1`.

- [ ] **Step 1: Write failing tests** in `test/launchers.test.cjs`. Each test drives an action with a recording `npm`/`run` stub that returns `0`, with `root = 'R'` and `options = ['--x']`. Prefixes are `path.join('R', <dir>)`:
  - `install`: `['--prefix', R, 'ci', '--ignore-scripts', '--x']`, then `['--prefix', R/backend/common, 'ci', '--x']`, `['--prefix', R/backend/common, 'run', 'build']`, then `ci --x` for `backend/auth`, `backend/tickets`, `backend/orders`, `backend/expiration` and `client`, in that order. `log` receives `Installing <dir> dependencies` before each of the last five.
  - `update`: the same shape with `update` in place of `ci` (the root call keeps `--ignore-scripts`). `Updating <dir> dependencies` is logged before each, and `Packages updated. Restart affected services to load the changes.` is logged at the end.
  - `test`: `backend/common` `run typecheck`, then `run test:ci` (no `--x`). Then, for `auth`, `tickets`, `orders` and `expiration`: `run typecheck` followed by `run test:ci --x`, with `Checking and testing <service>` logged first. Finally `client` `run lint`, then `run build`.
  - `vitest`: `run(process.execPath, [path.join(R, 'node_modules/vitest/vitest.mjs'), 'run', '--project', 'root', '--project', 'client', '--x'], { cwd: R })`.
  - `vitest without root dependencies`: when the `vitest.mjs` file does not exist (inject `exists: () => false` in the context), the action returns `1` and logs `Root dependencies are missing: run "npm install" first.` without calling `run`.
  - `install stops after a failing step`: the third npm call returns `1`, so the result is `1` and there are exactly three calls.

- [ ] **Step 2: Run them to see them fail**

Run: `node node_modules/vitest/vitest.mjs run --project root test/launchers.test.cjs`
Expected: FAIL, the action modules are missing.

- [ ] **Step 3: Implement the four action modules and the dispatcher.** Add `exists` (default `fs.existsSync`) to the context for `vitest`. `compose` delegates to `runCompose(options, root)`. Delete the four `.sh` files.

- [ ] **Step 4: Run the root project**

Run: `node node_modules/vitest/vitest.mjs run --project root test/package-manifests.test.cjs test/compose.test.cjs test/launchers.test.cjs`
Expected: PASS, including the two end-to-end tests from Task 1.

- [ ] **Step 5: Run it through npm the way users will**

Run: `npm run test:manifests`
Expected: PASS, and the output contains no `/mnt` and no `wsl`.

- [ ] **Step 6: Leave the changes for the owner to commit**, then update this plan.

### Task 4: `dev` action

**Files:**
- Create: `scripts/lib/env-file.cjs`, `scripts/actions/dev.cjs`
- Delete: `scripts/dev.sh`, `scripts/compose.sh`
- Modify: `scripts/manage-packages.cjs` (register `dev`)
- Test: `test/launchers.test.cjs`

**Interfaces:**
- Produces:
  - `parseEnvFile(text: string) => Array<[name, value]>`. It splits on `\r?\n` and keeps lines whose part before the first `=` matches `^[A-Za-z_][A-Za-z0-9_]*$`. The value is everything after the first `=`, verbatim, like `read -r name value` with `IFS='='`.
  - `devEnvironment(base: object, envFileText: string | null) => object`. It starts from a copy of `base` and adds each `.env` entry whose name is not already in `base`. Then it applies today's defaults from `dev.sh` exactly: `NODE_ENV=development` (forced), `JWT_KEY`, `MONGO_USR` (falling back to `MONGO_ROOT_USERNAME`, then `root`), `MONGO_PWD` (falling back to `MONGO_ROOT_PASSWORD`, then `local-dev-password`), `NATS_URL`, `REDIS_HOST`, `REDIS_PORT`, `AUTH_API_URL`, `ORDERS_API_URL`, `TICKETS_API_URL`, `TSC_WATCHFILE=DynamicPriorityPolling` (forced) and `CHOKIDAR_USEPOLLING=true` (forced).
  - `devCommands() => Array<{ name, command, env? }>`: the six entries from `dev.sh` with the same names, commands (`npm --prefix backend/<x> run dev`, `npm --prefix client run dev`) and per-service variables (`MONGO_URI`, `SERVER_PORT`, `NATS_CLIENT`) moved into `env`.
  - `dev(context) => number`. It runs `npm --prefix backend/common run build` through `context.npm` (stopping on failure). Then it starts `concurrently(devCommands(), { cwd: root, kill-others behaviour })` from the root `concurrently` package with the merged environment, and resolves to its exit status. Use `concurrently`'s programmatic API and whatever option name v10 uses for `--kill-others`.

- [ ] **Step 1: Write failing tests:**
  - `parseEnvFile` on `"A=1\r\nB=x=y\r\n# c\r\n1BAD=2\r\n"` returns `[['A', '1'], ['B', 'x=y']]`.
  - `devEnvironment({ A: 'shell' }, 'A=file\nB=file')` keeps `A === 'shell'` and sets `B === 'file'`. `NODE_ENV === 'development'` even when `base.NODE_ENV === 'production'`. `MONGO_USR === 'admin'` when `.env` has `MONGO_ROOT_USERNAME=admin`. With an empty base and no file: `MONGO_PWD === 'local-dev-password'` and `NATS_URL === 'nats://127.0.0.1:4222'`.
  - `devCommands()`: names are `['common', 'auth', 'tickets', 'orders', 'expiration', 'client']`. auth's env is `{ MONGO_URI: 'mongodb://127.0.0.1:27017/auth', SERVER_PORT: '3001' }`. tickets' env is `{ MONGO_URI: 'mongodb://127.0.0.1:27017/tickets', SERVER_PORT: '3003', NATS_CLIENT: 'tickets-dev' }`. orders uses port `3002` with `orders-dev`, and expiration's env is `{ NATS_CLIENT: 'expiration-dev' }`. No command contains `env ` or `bash`.

- [ ] **Step 2: Run them to see them fail.** Run: `node node_modules/vitest/vitest.mjs run --project root test/launchers.test.cjs`. Expected: FAIL, the modules are missing.

- [ ] **Step 3: Implement `env-file.cjs` and `dev.cjs`, register `dev`, and delete `dev.sh` and `compose.sh`.**

- [ ] **Step 4: Run them to see them pass.** Same command. Expected: PASS.

- [ ] **Step 5: Leave the changes for the owner to commit**, then update this plan.

### Task 5: Docs, superseded notes, final gate

**Files:**
- Modify: `README.md` (lines about the Compose shortcut, around 96; host npm workflows, around 98; "inside WSL" for local development, around 134; test launchers, around 209)
- Modify: `scripts/README.md`, `backend/common/README.md` (around line 30, "From WSL/Linux")
- Modify: `docs/superpowers/specs/2026-10-20-dependency-upgrade-design.md`, `2026-10-20-production-jetstream-design.md`, `2026-10-21-backend-folder-design.md`: add a one-line note under each WSL statement: `Superseded on 2026-10-21 by [native launchers](2026-10-21-native-launchers-design.md): root commands run natively, no WSL.`

- [ ] **Step 1: Update the docs** to say:
  - Root commands run in the shell you launch them from, with that environment's Node 24 and npm.
  - Compose uses Docker, then Podman, and otherwise fails.
  - `COMPOSE_BIN` is gone.
  - After switching from the old WSL launchers, reinstall with `npm install` from the shell you work in, because existing `node_modules` hold Linux-only native builds.

- [ ] **Step 2: Check for leftovers**

Run: `grep -rniE "wsl|wslpath|/mnt|COMPOSE_BIN" scripts/ README.md scripts/README.md backend/common/README.md`
Expected: no matches, except the README's "reinstall after switching from the old WSL launchers" sentence.

- [ ] **Step 3: Final gate**

Run: `npm run test:manifests` and `npm run test:routing`
Expected: both PASS. Record the counts in this plan.

- [ ] **Step 4: Leave the changes for the owner to commit.** Set `Status: done` and update this plan.

## Decisions

- 2026-10-21 — Root commands run where launched, from any shell; no WSL check. (User.)
- 2026-10-21 — Compose: Docker, else Podman, else error, on every platform; `COMPOSE_BIN` removed. (User.)
- 2026-10-21 — Manual platform runs (Windows + Docker, macOS, WSL) are the owner's and are out of this plan. (User.)
- 2026-10-21 — Launchers ported from bash to Node, because PowerShell resolves `bash` to WSL's `system32\bash.exe` and has no `env`. (Assistant, recorded in the spec.)
- 2026-10-21 — npm runs as `node $npm_execpath`; no `npm_execpath` means an error. The end-to-end test stubs `npm_execpath` in place of `COMPOSE_BIN`. (Assistant, recorded in the spec.)
- 2026-10-21 — A native failure of the backend suites on Windows is recorded as a blocker, not fixed in this change. (Assistant, recorded in the spec.)
- 2026-10-21 — Final review: restored the dev overlay on `compose:up`. Commit cf00824 landed during this work, and Task 2 had been written from the earlier file. (Assistant, review fix.)
- 2026-10-21 — Final review: a name repeated in `.env` keeps its first value, as the bash reader did. (Assistant, review fix.)
- 2026-10-21 — Final review: `scripts/README.md` no longer names WSL, so `grep -ri wsl scripts/` is empty as the spec requires. (Assistant, review fix.)
- 2026-10-21 — Review minors 1–4 fixed in Task 6: npm-only `npm_execpath`, signal exit codes 128 + n, testable `dev`, note placement. (User approved the proposal.)
- 2026-10-21 — Left as is: a `.cmd`-only docker or podman shim fails with EINVAL, because real installs ship an `.exe` and support would need a shell. The `dev` watchers use the npm on PATH, which is the launching shell's npm; `npm_execpath` inside concurrently's shell strings would bring back path quoting. (User approved the proposal.)

## Blockers

- None.
