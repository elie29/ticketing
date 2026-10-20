# Client without Next.js Implementation Plan

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 1 — 2026-10-20 · 50cf5ae — Framework-free client logic (session, page data, API proxy, browser-only fetch)
- [x] Task 2 — 2026-10-20 · 50cf5ae — Vite + React Router app replaces Next.js
- [x] Task 3 — 2026-10-20 · 50cf5ae — nginx serves the built client; `client` Compose service removed
- [x] Task 4 — 2026-10-20 · 50cf5ae — Acceptance shell checks and documentation
- [x] Task 5 — 2026-10-20 — End-to-end verification and browser check

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Next.js; the client becomes a Vite-built React SPA served as static files by nginx, with identical pages and behaviour.

**Architecture:** Pure logic (session loading, page-data rules, dev proxy table, fetch wrapper) lives in plain modules unit-tested under Vitest's node environment. React Router routes replace `pages/`; a session context replaces `_app.getInitialProps`; a `usePageData` hook replaces each page's `getInitialProps`. Production: the `nginx` image is built from `client/Dockerfile` (Vite build stage + `nginx:1.27-alpine`), serving `dist/` with an `index.html` fallback and proxying `/api/*` as today.

**Tech Stack:** Vite, `@vitejs/plugin-react`, React Router (library mode), React 19, Tailwind 4 via `@tailwindcss/vite`, Vitest 5, nginx 1.27-alpine, Node 24.

**Spec:** [docs/superpowers/specs/2026-10-20-client-vite-spa-design.md](../specs/2026-10-20-client-vite-spa-design.md)

## Global Constraints

- Node 24 everywhere; `client/package.json` keeps `"engines": { "node": ">=24 <25" }`.
- No `next` package, no `next.config.js`, no `API_BASE_URL`, no `getInitialProps` left anywhere in the repo.
- No state-management or data-fetching library; no browser test runner; client stays JavaScript.
- Same ten URLs: `/`, `/auth/signup`, `/auth/signin`, `/auth/signout`, `/tickets/new`, `/tickets/:ticketId`, `/tickets/:ticketId/edit`, `/orders`, `/orders/:orderId`, plus a not-found route.
- Only nginx publishes a port (`${HTTP_PORT:-80}:80`); infra overlay unchanged.
- Root gate names unchanged: `npm test`, `npm run test:routing`, `npm run test:acceptance`.
- `<title>TicTix</title>`, `lang="en"`.

## Review Focus

- Reload or deep link on `/tickets/<id>`, `/tickets/<id>/edit`, `/orders/<id>`: expect the page, not an nginx 404 (Task 3 curl check, Task 4 acceptance deep link).
- Unknown API path such as `/api/tickets/does-not-exist` must reach the service and return JSON, never the SPA `index.html` (Task 4 acceptance).
- Signing in, up or out must update the header without a manual reload (Task 2 `reloadSession` wiring; Task 5 browser check).
- A signed-in user must not see "Sign In" flash or a 401 prompt while the session request is in flight (Task 2: pages wait for `session.loading`; Task 5 browser check).
- After a redeploy the browser must not keep a stale `index.html` (Task 3: `Cache-Control: no-cache` on `index.html`, curl check).

---

### Task 1: Framework-free client logic

**Files:**

- Modify: `client/lib/ticketing.js` (add `loadSession`; `loadPageData` stops touching `context.res`)
- Modify: `client/api/build-client.js` (browser-only)
- Create: `client/api-proxy.js`
- Test: `client/test/ticketing.test.cjs`, `client/test/api-routing.test.cjs`

**Interfaces:**

- Produces:
  - `loadSession(client) -> Promise<{ currentUser: object|null, sessionError: boolean }>` in `client/lib/ticketing.js`. Calls `client('/api/users/currentuser', { signal: AbortSignal.timeout(5000) })`; 200 gives `currentUser` from the body; 401 gives `{ currentUser: null, sessionError: false }`; any other status or a thrown error gives `{ currentUser: null, sessionError: true }`.
  - `loadPageData({ currentUser, sessionError }, pathname, requireUser = false, client = buildClient()) -> Promise<{ data, error }>` with today's rules, minus `context.res`.
  - `buildClient() -> (pathname, options?) => Promise<Response>`: same-origin `fetch(pathname, …)`, `credentials: 'same-origin'`, 15 s default timeout, caller headers merged.
  - `apiProxy(env) -> Record<string, string>` in `client/api-proxy.js` (ESM): keys `/api/users`, `/api/orders`, `/api/tickets` mapped to `env.AUTH_API_URL`, `env.ORDERS_API_URL`, `env.TICKETS_API_URL`; a key is omitted when its variable is unset or empty.

- [x] 2026-10-20 · 50cf5ae — **Step 1: Write the failing tests**

In `client/test/ticketing.test.cjs` add (keep every existing case):

```js
test("a 200 session response yields the current user", async () => {
  const { loadSession } = await import("../lib/ticketing.js");
  const user = { id: "u1", email: "a@b.c" };
  const client = async () =>
    new Response(JSON.stringify({ currentUser: user }), { status: 200 });
  assert.deepEqual(await loadSession(client), {
    currentUser: user,
    sessionError: false,
  });
});
test("a 401 session response is a signed-out user, not an error", async () => {
  /* status 401 -> { currentUser: null, sessionError: false } */
});
test("a 5xx or unreachable session service is a session error", async () => {
  /* status 503 and a throwing client -> { currentUser: null, sessionError: true } */
});
test("signed-out users get 401 on pages that require a user", async () => {
  const { loadPageData } = await import("../lib/ticketing.js");
  assert.deepEqual(
    await loadPageData(
      { currentUser: null, sessionError: false },
      "/api/orders",
      true,
      async () => {
        throw new Error("must not fetch");
      },
    ),
    { data: null, error: { status: 401 } },
  );
});
test("page data keeps the backend status, and 503 when unreachable", async () => {
  /* 404 response -> { data: null, error: { status: 404 } }; throwing client -> status 503 */
});
```

In `client/test/api-routing.test.cjs`: delete `loadConfig`, the two rewrite tests, `server requests use the configured internal URL…`, `server requests default to the local frontend…`; drop `API_BASE_URL` handling and the `{ req }` arguments from `loadClient` and the remaining tests; rename `request options preserve JSON bodies and merge headers with server cookies` to `request options preserve JSON bodies and merge caller headers` and drop its cookie assertion. Add:

```js
test("the dev proxy is empty when no backend URL is configured", async () => {
  const { apiProxy } = await import("../api-proxy.js");
  assert.deepEqual(apiProxy({}), {});
});
test("the dev proxy routes each API prefix to its configured backend", async () => {
  const { apiProxy } = await import("../api-proxy.js");
  assert.deepEqual(
    apiProxy({
      AUTH_API_URL: "http://127.0.0.1:3001",
      ORDERS_API_URL: "http://127.0.0.1:3002",
      TICKETS_API_URL: "http://127.0.0.1:3003",
    }),
    {
      "/api/users": "http://127.0.0.1:3001",
      "/api/orders": "http://127.0.0.1:3002",
      "/api/tickets": "http://127.0.0.1:3003",
    },
  );
  assert.deepEqual(apiProxy({ AUTH_API_URL: "http://127.0.0.1:3001" }), {
    "/api/users": "http://127.0.0.1:3001",
  });
});
```

- [x] 2026-10-20 · 50cf5ae — **Step 2: Run** `npm run test:routing`. Expected: FAIL (`loadSession` not a function, `api-proxy.js` missing).
- [x] 2026-10-20 · 50cf5ae — **Step 3: Implement** the four Produces items. `_app.js` and the pages keep working for now: `_app.js` switches to `loadSession(buildClient())` only in Task 2.
- [x] 2026-10-20 · 50cf5ae — **Step 4: Run** `npm run test:routing`. Expected: PASS, no skipped tests.
- [x] 2026-10-20 · 50cf5ae — **Step 5: Commit** `✅ test(client): framework-free session, page-data and dev-proxy logic`.

### Task 2: Vite + React Router app replaces Next.js

**Files:**

- Create: `client/index.html`, `client/vite.config.js`, `client/src/main.jsx`, `client/src/app.jsx`, `client/src/session.jsx`, `client/src/hooks/use-page-data.js`, `client/src/pages/not-found.jsx`
- Move (git mv, then edit): `client/pages/**` to `client/src/pages/**` as `.jsx` (`index.jsx`, `auth/signin.jsx`, `auth/signup.jsx`, `auth/signout.jsx`, `tickets/new.jsx`, `tickets/ticket.jsx`, `tickets/edit.jsx`, `orders/index.jsx`, `orders/order.jsx`); `client/components/*.js` to `client/src/components/*.jsx`; `client/hooks/*` to `client/src/hooks/*` (`.jsx` when they contain JSX); `client/lib/ticketing.js`, `client/api/build-client.js`, `client/styles/globals.css` to `client/src/…`
- Delete: `client/pages/_app.js`, `client/next.config.js`, `client/postcss.config.js`
- Modify: `client/package.json`, `client/package-lock.json`, `scripts/dev.sh` (drop `API_BASE_URL`), `client/test/*.test.cjs` import paths (`../src/lib/ticketing.js`, `../src/api/build-client.js`); `client/api-proxy.js` stays at `client/` root.

**Interfaces:**

- Consumes: Task 1's `loadSession`, `loadPageData`, `buildClient`, `apiProxy`.
- Produces:
  - `SessionProvider` and `useSession() -> { currentUser, sessionError, loading: boolean, reloadSession: () => Promise<void> }` in `client/src/session.jsx`. Calls `loadSession(buildClient())` at start and on every `useLocation().pathname` change; `loading` is true only until the first answer; later reloads keep the previous state; an answer from an older request is dropped (request counter).
  - `usePageData(pathname, { requireUser = false } = {}) -> { data, error, loading }` in `client/src/hooks/use-page-data.js`; waits for `session.loading` to be false, then calls `loadPageData(session, pathname, requireUser)`; refetches when `pathname` or the session user changes.
  - `client/package.json` scripts exactly `dev: "vite"`, `build: "vite build"`, `preview: "vite preview"`; `"type": "module"`; `next` and `postcss` removed; `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` added to devDependencies, `react-router` to dependencies; `@tailwindcss/postcss` removed.
  - `vite.config.js`: plugins `react()` and `tailwindcss()`; `server: { port: 3000, strictPort: true, proxy: apiProxy(process.env), watch: { usePolling: true, interval: 300 } }`; build output `dist/`.

- [x] 2026-10-20 · 50cf5ae — **Step 1:** `git mv` the files listed above; `npm --prefix client uninstall next postcss @tailwindcss/postcss`; `npm --prefix client install react-router`; `npm --prefix client install -D vite @vitejs/plugin-react @tailwindcss/vite`. Update `client/package.json` scripts and `"type"`.
- [x] 2026-10-20 · 50cf5ae — **Step 2:** Write `index.html`, `vite.config.js`, `main.jsx` (`createRoot` on `#root`, `BrowserRouter`, `SessionProvider`, global CSS and the three `@fontsource/ibm-plex-sans` weights imported as in `_app.js`), `app.jsx` (the `_app.js` layout markup verbatim; `Routes` for the ten URLs and `*` to `NotFoundPage`, whose `<h1>` reads "Page not found" with a link back to tickets).
- [x] 2026-10-20 · 50cf5ae — **Step 3:** Port each page and component: `getInitialProps` to `usePageData` with the same pathname and `requireUser` flag it used; while `loading`, render `<p role="status" className="py-12 text-stone-500">Loading…</p>`; `next/link` to `react-router` `Link` (`href` to `to`; the object form in `ui.js` becomes ``to={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`}``); `useRouter` to `useNavigate`/`useParams`/`useSearchParams`/`useLocation`; `router.asPath` to `location.pathname + location.search`; `Header` reads `useLocation().pathname`. `auth-form` and `signout` call `await reloadSession()` before `navigate(...)`. Pages read `currentUser` from `useSession()` instead of props.
- [x] 2026-10-20 · 50cf5ae — **Step 4: Run** `grep -rnE "next/|getInitialProps|API_BASE_URL" client scripts --exclude-dir=node_modules --exclude-dir=dist`. Expected: no output.
- [x] 2026-10-20 · 50cf5ae — **Step 5: Run** `npm run test:routing` (PASS) and `npm --prefix client run build` (exit 0, `client/dist/index.html` exists, contains `<title>TicTix</title>`).
- [x] 2026-10-20 · 50cf5ae — **Step 6: Run** `npm run compose:infra` then `npm run dev`; `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/tickets/x` gives 200 and `curl -s http://127.0.0.1:3000/api/tickets` gives JSON through the proxy. Stop dev.
- [x] 2026-10-20 · 50cf5ae — **Step 7: Commit** `♻️ refactor(client): replace Next.js with Vite and React Router`.

### Task 3: nginx serves the built client

**Files:**

- Modify: `client/Dockerfile`, `deploy/nginx/default.conf`, `docker-compose.yaml`, `.dockerignore` (add `**/dist`), `scripts/compose.cjs`
- Test: `test/compose.test.cjs`
- Delete: `client/.dockerignore` (build context becomes the repository root)

**Interfaces:**

- Consumes: Task 2's `vite build` output in `client/dist/`.
- Produces: `nginx` Compose service with `build: { context: ., dockerfile: client/Dockerfile }`, no `image:` and no config volume; `client` service gone.

- [x] 2026-10-20 · 50cf5ae — **Step 0 (TDD):** in `test/compose.test.cjs` change the `infra` stop expectation to `[...dev, 'stop', 'nginx', 'auth', 'tickets', 'orders', 'expiration']`; run `npm run test:manifests` (FAIL); drop `'client'` from the stop list in `scripts/compose.cjs`; run again (PASS).
- [x] 2026-10-20 · 50cf5ae — **Step 1:** `client/Dockerfile`: stage `build` (`node:24-alpine`, `WORKDIR /app`, copy `client/package.json` and `client/package-lock.json`, `npm ci`, copy `client/`, `npm run build`); final stage `nginx:1.27-alpine` copying `/app/dist` to `/usr/share/nginx/html` and `deploy/nginx/default.conf` to `/etc/nginx/conf.d/default.conf`.
- [x] 2026-10-20 · 50cf5ae — **Step 2:** `default.conf`: keep the three `/api` locations and the proxy headers; replace `location /` with `root /usr/share/nginx/html;` plus `location / { try_files $uri /index.html; }`, `location = /index.html { add_header Cache-Control "no-cache"; }`, `location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }`, and `location /api/ { return 404; }` after the three API locations.
- [x] 2026-10-20 · 50cf5ae — **Step 3:** `docker-compose.yaml`: remove the `client` service; `nginx` builds as above and `depends_on` auth, tickets and orders healthy.
- [x] 2026-10-20 · 50cf5ae — **Step 4: Run** `docker compose config -q` and `docker compose up --build -d --wait`. Expected: no `client` container; nginx up.
- [x] 2026-10-20 · 50cf5ae — **Step 5: Run** for `/`, `/tickets/x`, `/orders/x/`, `/tickets/x/edit`: `curl -s -o /dev/null -w '%{http_code}'` gives 200 each; `curl -sI http://localhost/` shows `Cache-Control: no-cache`; one `/assets/*.js` from the HTML shows `max-age=31536000`; `curl -s http://localhost/api/tickets/does-not-exist` is JSON, not HTML; `curl -s -o /dev/null -w '%{http_code}' http://localhost/api/users` and `/api/nope` give 404.
- [x] 2026-10-20 · 50cf5ae — **Step 6: Commit** `🐳 build(nginx): serve the Vite build from the nginx image`.

### Task 4: Acceptance shell checks and documentation

**Files:**

- Modify: `test/acceptance/ticketing.test.cjs`, `README.md`, `client/README.md`, `scripts/README.md`

- [x] 2026-10-20 · 50cf5ae — **Step 1:** Replace the test `renders the ticket catalogue, signup, and signin pages` with `serves the app shell for page URLs and leaves API paths to the services`: for `/`, `/auth/signup`, `/auth/signin`, each 200 with `html.includes('id="root"')` and `/<script[^>]+type="module"/`; after creating a ticket in the same test (existing helpers), `/tickets/<id>` returns the same shell; `GET /api/tickets/000000000000000000000000` returns a non-HTML body (`typeof data !== 'string'` with the existing `expectStatus` parser, status 404).
- [x] 2026-10-20 · 50cf5ae — **Step 2: Run** `npm run compose:acceptance` with `ORDER_EXPIRATION_SECONDS=15` exported, then `npm run test:acceptance`. Expected: 6 passed.
- [x] 2026-10-20 · 50cf5ae — **Step 3:** Docs: root README architecture sentence and mermaid (nginx serves the app files; no client container), "Production stack" paragraph (client image is Vite build + nginx), dev paragraph (Vite on :3000 with proxy), acceptance description (app shell, no rendered-content checks); `client/README.md` Development and Tests sections; `scripts/README.md` `dev.sh` line. `./node_modules/.bin/prettier --check "**/*.md"` passes.
- [x] 2026-10-20 · 50cf5ae — **Step 4: Commit** `✅ test(acceptance): check the SPA shell through nginx; docs for the Vite client`.

### Task 5: End-to-end verification and browser check

- [x] 2026-10-20 · 50cf5ae — `npm test` passes (client step is now `vite build`): 99 tests, build ok.
- [x] 2026-10-20 · 50cf5ae — `npm run test:manifests` and `npm run test:routing` pass (7/7, 18/18 within `npm test`).
- [x] 2026-10-20 · 50cf5ae — (owner: all ok) Browser (owner, or a session with a browser tool), prod stack at `http://localhost`: sign up, header shows the email without reload; sign out in a second tab, then navigate in the first: header shows signed out; create a ticket; reserve it; order countdown; cancel; sign out, header updates; reload on `/orders/<id>`; `/nope` shows "Page not found"; signed-in reload of `/orders` shows no sign-in flash.
- [x] 2026-10-20 · 50cf5ae — (owner: all ok) Accessibility pass per the global workflow (skip link, focus after navigation, `role="status"` loading text announced). Carried over from the prod-compose plan, whose browser check passed on the Next client.
- [x] 2026-10-20 · 50cf5ae — (owner: all ok) Redis Insight at `http://127.0.0.1:15540` (infra mode): accept the EULA, confirm the `ticketing` connection (carried over from the prod-compose plan).
- [x] 2026-10-20 — Final whole-branch review (fresh reviewer): 1 Critical fixed test-first (ticket sign-in link used Next's `router.asPath`, white screen for signed-out visitors; regression test `client/test/ticket-page.test.cjs`), 0 Important, 4 Minor deferred to the owner. Local commit of the fix. No push.

## Decisions

- 2026-10-20 — Next.js removed; client kept simple (owner).
- 2026-10-20 — Acceptance checks the app shell and API paths, no browser test runner (assistant call; owner indifferent).
- 2026-10-20 — `loadPageData` keeps its name and argument order, gaining an injectable `client`, so the existing session-error test stays valid (assistant call).
- 2026-10-20 — Tailwind moves to `@tailwindcss/vite` and the client package becomes `"type": "module"`, removing `postcss.config.js` (assistant call; one less config file).
- 2026-10-20 — The nginx image is built from `client/Dockerfile` with the repository root as context, so `client/.dockerignore` is replaced by `**/dist` in the root `.dockerignore` (assistant call; keeps the build working under Podman, which may not support Compose `additional_contexts`).
- 2026-10-20 — `api-proxy.js` stays at `client/` root next to `vite.config.js`; app code moves under `client/src/` (assistant call).
- 2026-10-20 — The session is re-checked on every in-app navigation, as `_app.getInitialProps` does today (builder check; the spec's "every behaviour stays" goal decides it).
- 2026-10-20 — No DOM test environment; logic in plain functions, hooks thin (builder check, assistant call).
- 2026-10-20 — `location /api/ { return 404; }` keeps unknown API paths out of the SPA fallback; Vite polls for file changes as Next did; `compose:infra` stops no `client` service (builder check, assistant calls).
- 2026-10-20 — Work runs on local branch `client-vite-spa` (assistant call; executing-plans does not build on `main` without consent, and a separate worktree would lose `.env` and the running Compose project).
- 2026-10-20 — Task 1 made `buildClient` browser-only, so the old Next server-side fetches break between the Task 1 and Task 2 commits (assistant ruling; Task 2 deletes that code, the branch is not shipped in between).
- 2026-10-20 — Vite's dev server keeps its loopback-only default (`localhost`, IPv6 here); use `http://localhost:3000`, not `127.0.0.1:3000` (assistant ruling; stricter than Next, which listened on all interfaces).
- 2026-10-20 — `/**/dist` added to `.gitignore`; the Task 2 commit that had included `client/dist` was amended before anything was shared (assistant ruling).
- 2026-10-20 — Pages keep their original body as an inner view component behind a thin default export that calls `usePageData` and shows `Loading…`; the header hides account links until the first session answer (assistant call, from the spec's no-flash rule).
- 2026-10-20 — `location = /api/users { return 404; }` added: nginx otherwise answers 301 to the auth location for `/api/users` (assistant ruling, matches the plan's 404 expectation).
- 2026-10-20 — The new acceptance shell test passed on its first run (Task 3 had built the behaviour); RED was shown by the old rendered-content test failing against the new stack (assistant ruling).
- 2026-10-20 — `TicketView` is a named export so its regression test can render it with `react-dom/server` in Node (assistant ruling; no DOM environment by design).
- 2026-10-20 — Deferred minors for the owner: no error boundary around the routes; unknown `/api/*` 404 bodies are nginx HTML, not JSON; one render of stale data when a mounted route's `:id` changes; no static undefined-name check (ESLint `no-undef`) in `npm test`.
- 2026-10-20 — Branch `client-vite-spa` squash-merged into `main` as `50cf5ae` (owner choice); task lines now cite that commit, since the branch commits no longer exist.
- 2026-10-20 — History rewritten by the owner (squash into `50cf5ae`); commit references updated to `50cf5ae`, which now holds the work of `b82aa81`.

## Blockers

None.
