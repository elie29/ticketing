# Client without Next.js — design

Date: 2026-10-20. Follows [2026-10-20-prod-compose-nginx-design.md](2026-10-20-prod-compose-nginx-design.md), whose stack (nginx in front of the services) this design builds on.

## Intent

The owner wants the client kept simple: fewer moving parts and less framework. Next.js is removed. The client becomes a plain React single-page app built by Vite into static files that nginx serves. Same app, same pages, same look; only the machinery underneath changes.

## Goals

- Remove the `next` dependency, `next.config.js` and everything that exists only for Next (server-side `getInitialProps`, `API_BASE_URL`, the SSR cookie forwarding in `api/build-client.js`, the client healthcheck workaround in `docker-compose.yaml`).
- No Node server for the frontend in production: nginx serves the built files and keeps routing `/api/*` to the services. The `client` Compose service disappears.
- `npm run dev` keeps hot reload on `http://localhost:3000`, with `/api/*` proxied to the local backends as today.
- Every current page and behaviour stays: the ten routes, the header and session state, live refresh of tickets and orders, countdowns, forms, validation errors, the "account service unavailable" notice, return paths after sign-in.

## Non-goals

- No redesign, no new pages, no new features.
- No state-management or data-fetching library (no Redux, React Query, SWR). Plain React state and hooks.
- No TypeScript migration of the client.
- No server-side rendering of any kind.

## Anti-goals

- Adding a heavy tool to replace what Next did (for example a browser test runner, or a second server). That would defeat "simple".
- Visible behaviour regressions: a page that used to work while signed out now demanding sign-in, a lost validation message, a broken deep link or reload on `/tickets/<id>`.

## Constraints

- Node 24, as every package (`engines` and `test/package-manifests.test.cjs` alignment checks stay green).
- Client stays plain JavaScript with React 19, Tailwind 4, `@fontsource/ibm-plex-sans` and `lucide-react`, all kept.
- The production Compose topology from the previous design stays: only nginx publishes a port; `JWT_KEY` / `MONGO_ROOT_PASSWORD` required; infra overlay unchanged.
- Root gates keep their names: `npm test` (which runs `npm --prefix client run build`), `npm run test:routing` (client tests), `npm run test:acceptance`.
- Exact dependency versions are pinned through `client/package-lock.json`; image tags pinned as in the rest of Compose.

## Decided

- **Owner:** remove Next.js; keep the client simple.
- **Owner:** delete `client/AGENTS.md` (done).
- **Owner left to the assistant:** how acceptance coverage of pages changes (see Tests).

## Design (assistant's calls unless marked otherwise)

### Stack

- **Vite** builds the app; **React Router** (library mode, `BrowserRouter` + `Routes`) replaces file-based pages. Both latest stable at implementation time.
- One `index.html` at `client/` root with `<div id="root">`, `<title>TicTix</title>`, `lang="en"`, the viewport meta; `src/main.jsx` mounts the app.
- Files that contain JSX get the `.jsx` extension (Vite's default handling); plain helpers stay `.js`.

### Routes

The ten Next pages map one-to-one to React Router routes with the same URLs:

| URL | Today |
| --- | --- |
| `/` | `pages/index.js` |
| `/auth/signup`, `/auth/signin`, `/auth/signout` | `pages/auth/*.js` |
| `/tickets/new` | `pages/tickets/new.js` |
| `/tickets/:ticketId`, `/tickets/:ticketId/edit` | `pages/tickets/[ticketId]/*.js` |
| `/orders`, `/orders/:orderId` | `pages/orders/*.js` |

Unknown URLs render a simple not-found message inside the layout (Next served its 404 page).

`next/link` becomes React Router `Link` (prop `href` becomes `to`); `useRouter()` becomes `useNavigate`, `useParams`, `useSearchParams` and `useLocation` (`router.asPath` becomes `location.pathname + location.search`; `router.query.returnTo` becomes `searchParams.get('returnTo')`); `Router.push` becomes `navigate`.

### Session and layout

`_app.js` becomes the layout component: skip link, `Header`, `<main id="main">`, the session-unavailable notice, and the routed page. The current user is loaded when the app starts and again on every in-app navigation (path change), as `_app.getInitialProps` does today (`GET /api/users/currentuser`, same rules: 200 means signed in, 401 means signed out, anything else or a network failure means `sessionError`). So the session-unavailable notice clears once auth recovers, and a sign-out in another tab is noticed on the next navigation. Sign-in, sign-up and sign-out also wait for a reload before navigating, so the header updates. Later reloads keep showing the previous session state until the answer arrives; a stale answer from an earlier navigation never overwrites a newer one. Pages receive `currentUser` and `sessionError` as they do now (prop or a small React context; builder's choice).

While the first session request is in flight, the layout renders the header area without account links and the page area in its loading state, so nothing flashes "signed out" for a signed-in user.

### Page data

`getInitialProps` and `loadPageData(context, …)` are replaced by one hook, `usePageData(pathname, { requireUser })`, that keeps today's rules:

- `requireUser` and `sessionError`: error 503.
- `requireUser` and no user: error 401 (the page shows its existing sign-in prompt).
- Otherwise fetch `pathname`; on failure, error with the response status or 503.
- Returns `{ data, error, loading }`.

Pages render a short loading state (an accessible `role="status"` message) until data arrives, then exactly what they render today. `useLiveData` keeps polling every 3 s and on focus, seeded by the first load. The hook only exists in the browser, so `api/build-client.js` loses its server branch, `req` header forwarding and `API_BASE_URL`; it keeps the bounded timeout and `credentials: 'same-origin'`.

HTTP status codes of pages: with static files every page URL answers 200 (Next set 401/404/503 on the response). Accepted: the status is shown in the page, as today.

### Development

`client/vite.config.js` runs the dev server on port 3000 and proxies `/api/users` to `AUTH_API_URL`, `/api/orders` to `ORDERS_API_URL` and `/api/tickets` to `TICKETS_API_URL`, read from the environment exactly as `next.config.js` does today (a prefix whose variable is unset is not proxied). File watching polls, as the Next dev setup does today (`CHOKIDAR_USEPOLLING`, webpack `poll: 300`). `scripts/dev.sh` keeps exporting those three; `API_BASE_URL` is dropped from it. The `client` package scripts become `dev` (`vite`), `build` (`vite build`) and `preview` (`vite preview`); `start` is removed.

### Production image and Compose

- `client/Dockerfile` becomes: a Node 24 build stage (`npm ci`, `vite build`), then `nginx:1.27-alpine` with the built `dist/` copied to `/usr/share/nginx/html` and `deploy/nginx/default.conf` copied in. It listens on port 80 inside the network, published on `${HTTP_PORT:-80}` as today.
- In `docker-compose.yaml`, the `nginx` service builds from that Dockerfile (build context: repository root so it can read both `client/` and `deploy/nginx/`) instead of mounting the config into the stock image. The `client` service is removed; `nginx` depends on auth, tickets and orders being healthy.
- `deploy/nginx/default.conf`: the three `/api` locations stay, and a `location /api/ { return 404; }` catches any other API path (including `/api/users` without the trailing slash) so it never falls through to the app page; `location /` becomes `root /usr/share/nginx/html; try_files $uri /index.html;` so deep links and reloads work. Hashed files under `/assets/` get a long cache lifetime; `index.html` gets `Cache-Control: no-cache`.
- `client/.dockerignore` adds `dist`.

### Tests

- `client/test/ticketing.test.cjs` (helpers in `lib/ticketing.js`) keeps all its cases; the session case moves with the session logic it tests.
- `client/test/api-routing.test.cjs`: the `next.config.js` rewrite cases become Vite proxy cases (same three prefixes, unset variable means no proxy); the SSR cases (server base URL, cookie forwarding) are deleted with the code they test; the browser same-origin case stays.
- Acceptance (`test/acceptance/ticketing.test.cjs`): the API scenarios are unchanged. "renders the ticket catalogue, signup, and signin pages" becomes "serves the app shell for page URLs": `/`, `/auth/signup`, `/auth/signin` and a deep link `/tickets/<id of a created ticket>` each return 200 HTML containing `id="root"` and the built script tag. Rendered-content checks (`<h1>Tickets</h1>`, `id="ticket-search"`) are dropped; no browser test runner is added (assistant's call, owner indifferent).
- Unit tests stay in Vitest's node environment: no jsdom or Testing Library. The session, page-data and proxy rules live in plain functions that are tested directly; hooks and components stay thin (assistant's call, in line with "simple").
- `scripts/compose.cjs` and `test/compose.test.cjs`: `compose:infra` no longer stops a `client` service.
- `test/package-manifests.test.cjs`: whatever it asserts about the client's scripts or dependencies is updated to the new scripts.

### Documentation

Root `README.md` (architecture text and diagram: no client container, nginx serves the app), `client/README.md`, `scripts/README.md`: describe Vite, React Router, the dev proxy and the static production image.

## Left to the builder

- Exact Vite / React Router / `@vitejs/plugin-react` versions; whether Tailwind 4 goes through `@tailwindcss/vite` or stays on PostCSS.
- Prop drilling versus a context for `currentUser`.
- The wording of the loading and not-found messages (short, plain, accessible).
- File layout under `client/src/` (pages, components, hooks, lib may move under `src/`).

## Risks

- Bugs in the move from `getInitialProps` to client-side loading (a page rendering before its data, or an error status lost). The per-page behaviour list above is the checklist; the browser check of every page closes it.
- Acceptance no longer proves pages render content; the client unit tests and the manual browser pass cover that.
