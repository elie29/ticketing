# Client

Next.js Pages Router application with React, Tailwind CSS, local IBM Plex Sans fonts and Lucide icons. Browser requests stay on the frontend origin; Next rewrites `/api/users`, `/api/tickets` and `/api/orders` to their owning services.

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

From the repository root, `docker compose up --build -d` or `podman compose up --build -d` starts the app at http://localhost:3000. For source hot reload, use the [root infrastructure/watch workflow](../README.md#infrastructure-containers-and-local-watch).

Server-side requests use `API_BASE_URL`. Rewrites use `AUTH_API_URL`, `ORDERS_API_URL` and `TICKETS_API_URL`; Compose supplies internal hosts and the root watch launcher supplies localhost. SSR forwards cookies and uses bounded requests. Browser and server errors retain the backend's validation details. Session-service failure is distinguished from a signed-out user.

## Tests and Build

From the repository root after installing dependencies:

```bash
npm run test:routing
npm --prefix client run build
```

The first command runs both [test/api-routing.test.cjs](test/api-routing.test.cjs) and [test/ticketing.test.cjs](test/ticketing.test.cjs). The build checks all page routes; it is a compilation gate, not a production Docker deployment. Do not run it concurrently with local Next development using the same `.next` directory. The Dockerfile intentionally starts the development server.

Root acceptance tests exercise rendered pages, cookie authentication and real cross-service reservation/cancellation/expiration. See [root documentation](../README.md#tests) for live-stack requirements.