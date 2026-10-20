# Client review follow-ups Implementation Plan

> **Status:** done
>
> **Resume at:** — (nothing; every task is checked)
>
> **Last updated:** 2026-10-20

## Tasks

- [x] Task 1 — 2026-10-20 · 50cf5ae — Undefined-name lint in `npm test`
- [x] Task 2 — 2026-10-20 · 50cf5ae — Error boundary around the routes
- [x] Task 3 — 2026-10-20 · 50cf5ae — No stale page data when a route parameter changes
- [x] Task 4 — 2026-10-20 — JSON 404 for unknown `/api` paths

**Goal:** Close the four minor findings of the final review of `2026-10-20-client-vite-spa.md` (squash commit `50cf5ae`).

**Architecture:** Small, independent changes on `main`, each test-first. No DOM test environment: React output is checked with `react-dom/server` in Node, hook rules through plain functions.

**Spec:** the review findings as approved by the owner in chat on 2026-10-20 (small change; no separate spec), within the constraints of [2026-10-20-client-vite-spa-design.md](../specs/2026-10-20-client-vite-spa-design.md).

## Task 1 — Undefined-name lint

- [x] 2026-10-20 · 50cf5ae — Add `eslint`, `globals` and `eslint-plugin-react` to `client` devDependencies; `client/eslint.config.js` lints `src/**/*.{js,jsx}` with only `no-undef` and `react/jsx-no-undef` (browser globals, JSX enabled); `client` script `lint: "eslint src"`.
- [x] 2026-10-20 · 50cf5ae — RED: a temporary file using an undefined name makes `npm --prefix client run lint` fail; remove it; GREEN on the real sources.
- [x] 2026-10-20 · 50cf5ae — `scripts/test.sh` runs `npm --prefix client run lint` before the client build; `npm test` passes.

## Task 2 — Error boundary

- [x] 2026-10-20 · 50cf5ae — Test `client/test/error-boundary.test.cjs`: `ErrorBoundary.getDerivedStateFromError(new Error('x'))` gives `{ failed: true }`; rendering a boundary instance with that state inside `MemoryRouter` contains `Unable to load this page` and `Back to tickets`; without it, its children.
- [x] 2026-10-20 · 50cf5ae — `client/src/components/error-boundary.jsx`: class `ErrorBoundary`, renders `<PageProblem error={{ status: 500 }} />` after an error; `app.jsx` wraps `<Routes>` in it, keyed by `location.pathname` so navigating away clears it.

## Task 3 — No stale page data

- [x] 2026-10-20 · 50cf5ae — Test in `client/test/ticketing.test.cjs`: `pageStateFor(state, pathname)` returns `state` when `state.pathname === pathname`, else `{ data: null, error: null, loading: true }`.
- [x] 2026-10-20 · 50cf5ae — `pageStateFor` in `client/src/lib/ticketing.js`; `usePageData` stores the `pathname` with each result and returns `pageStateFor(state, pathname)`.

## Task 4 — JSON 404 for unknown API paths

- [x] 2026-10-20 · 50cf5ae — Acceptance (`serves the app shell…` test): `GET /api/nope` and `GET /api/users` return 404 with `data.errors` an array (RED against the running stack: HTML body).
- [x] 2026-10-20 · 50cf5ae — `deploy/nginx/default.conf`: both 404 locations use `default_type application/json;` and `return 404 '{"errors":[{"message":"Not found"}]}';`. Rebuild nginx; acceptance 6/6.

## Decisions

- 2026-10-20 — Owner approved fixing all four review minors directly on `main` ("yes on main").
- 2026-10-20 — The error page reuses `PageProblem` with status 500 ("Unable to load this page", "Back to tickets", "Try again"); unknown API paths answer the services' error shape `{"errors":[{"message":"Not found"}]}`; lint is ESLint limited to undefined names (assistant calls, stated to the owner in chat).
- 2026-10-20 — History rewritten by the owner (squash into `50cf5ae`); commit references updated to `50cf5ae`, which now holds the work of `771b878`, `790f89b`, `b82aa81`, `c82f91e`, `fd5cb73`.

## Blockers

None.
