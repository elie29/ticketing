# Client

React single-page app built by Vite, with React Router, Tailwind CSS, local IBM Plex Sans fonts and Lucide icons. Source lives in [src/](src); routes are declared in [src/app.jsx](src/app.jsx). Pages load their data in the browser and show a short loading state first. Browser requests stay on the frontend origin: in development the Vite dev server proxies `/api/users`, `/api/tickets` and `/api/orders` to their services ([api-proxy.js](api-proxy.js)); in production nginx does.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Ticket catalogue with search/filter states. |
| `/tickets/new` | Authenticated ticket creation. |
| `/tickets/[ticketId]` | Ticket detail and reservation. |
| `/tickets/[ticketId]/edit` | Owner-only editing of an unreserved ticket. |
| `/orders` | The signed-in user's orders. |
| `/orders/[orderId]` | Confirmed status, expiry countdown and cancellation confirmation. |
| `/auth/signup`, `/auth/signin`, `/auth/signout` | Session management and safe internal return paths. |

Order pages poll server status; an elapsed countdown does not locally invent cancellation. Price formatting does not assume a currency. No payment flow is implemented.

## Development

From the repository root, `docker compose up --build -d` or `podman compose up --build -d` starts the production stack behind nginx at http://localhost (copy `.env.example` to `.env` first). For source hot reload, use the [root infrastructure/watch workflow](../README.md#infrastructure-containers-and-local-watch).

All requests run in the browser on the same origin. The Vite dev server proxies `/api/users`, `/api/orders` and `/api/tickets` to `AUTH_API_URL`, `ORDERS_API_URL` and `TICKETS_API_URL`, supplied as localhost by the root watch launcher; in production nginx routes `/api`. Requests are bounded by a timeout. Browser and server errors retain the backend's validation details. Session-service failure is distinguished from a signed-out user.

## Tests and Build

From the repository root after installing dependencies:

```bash
npm run test:routing
npm --prefix client run build
```

The first command runs both [test/api-routing.test.cjs](test/api-routing.test.cjs) and [test/ticketing.test.cjs](test/ticketing.test.cjs). The build (`vite build`, output in `dist/`) compiles every page. The [Dockerfile](Dockerfile), built from the repository root, runs that build and copies `dist/` into the nginx image together with [../deploy/nginx/default.conf](../deploy/nginx/default.conf).

Root acceptance tests check that page URLs return the app shell, and exercise cookie authentication and real cross-service reservation/cancellation/expiration. See [root documentation](../README.md#tests) for live-stack requirements.
