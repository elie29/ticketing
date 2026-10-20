# Ticket and Order Client

## Approved Scope

The user requested implementation of the previously agreed frontend: browse/create/edit owned tickets, reserve tickets, view owned orders, display expiration countdowns, and cancel orders. Tailwind CSS was explicitly agreed. Retain Next.js Pages Router, Node 24, native fetch, existing authentication/API/event contracts, and Vitest. No payments, invented event metadata, currency model, or backend features.

## Experience

The first screen is a useful ticket catalogue, not an authentication placeholder or landing page. Provide title search and availability/ownership filters, ticket prices/status, links to details, and a create command. Ticket detail supports reservation for authenticated users and editing by the owner only while unreserved. Create/edit forms have visible labels, validation, pending/error states, and duplicate-submit protection.

My Orders lists only the user's orders. Order detail shows its ticket, price, server status, expiry and countdown, and cancellation where supported. At the deadline show expiration pending until the API confirms cancellation; never treat the local clock as authority. Poll while reservations are active and refresh ticket availability. Handle signed-out, forbidden, missing, loading, empty, failed-request, expired, and cancelled states.

Use a restrained responsive operational layout: white/neutral surfaces, dark text, green commands, coral accents, IBM Plex Sans, and Lucide icons. Keep sections unframed, tables usable on mobile, keyboard focus visible, errors announced, form labels associated, and icon controls named. Replace Bootstrap rather than ship conflicting design systems. Preserve TicTix identity and sign-in/sign-up/sign-out flows; add safe internal return navigation.

## Existing API

- Public GET /api/tickets returns all tickets, including reserved tickets, and GET /api/tickets/:id returns detail.
- Authenticated POST /api/tickets and owner-only PUT /api/tickets/:id accept title and positive numeric price; a reserved ticket cannot be edited.
- Authenticated POST /api/orders accepts ticketId; GET /api/orders and GET /api/orders/:id expose owned orders; DELETE /api/orders/:id cancels an owned order.
- Current-user returns 401 when signed out. Cookie name remains express:sess. Do not expose session cookies in rendered page props.
- There is no payment API, currency field, venue, image, event date, or ticket deletion endpoint. Do not fabricate them. Display numeric prices without asserting a currency.

## Security and Boundaries

Backend authorization remains authoritative. Client ownership/disabled states improve usability but do not replace it. Treat titles/email/API errors as text, validate internal return destinations with URL parsing, preserve same-origin credentials and server cookie forwarding, and never render raw HTML. Do not add token storage. Show existing backend validation failures without leaking unexpected response bodies.

The requested security-review skill is unavailable in the exposed skill list; perform these explicit checks manually and do not claim that skill ran.

## Verification

Add focused Vitest checks for API response/errors, safe returns, ownership/availability, price display, and countdown calculations before implementation. Preserve existing suites; replace the old signed-out-home placeholder assertion with the new catalogue contract and add ticket/order page assertions. Run frontend production build and client tests, inspect the running app with browser automation at desktop/mobile sizes, exercise actual auth/create/edit/reserve/cancel flows, and rerun the root gate against the real acceptance stack. Preserve the existing automatic-expiration coverage.
