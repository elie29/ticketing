# Auth

Owns users and password hashes in the `auth` MongoDB database. Express issues JWTs inside the shared `express:sess` cookie. This service does not use NATS or Redis.

## API

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/users/signup` | Validate email/password, create a user and establish a session. |
| POST | `/api/users/signin` | Verify credentials and establish a session. |
| POST | `/api/users/signout` | Clear the session. |
| GET | `/api/users/currentuser` | Return the authenticated user; unauthorized requests receive 401. |

Passwords are hashed by the password service, never returned by the API. Validation errors retain field names in the shared `{ errors: [...] }` response.

## Development

Run the full stack from the repository root with `docker compose up --build -d` or `podman compose up --build -d` (after `cp .env.example .env`). For local watchers, follow the [root development instructions](../README.md#infrastructure-containers-and-local-watch).

Local HTTP port: `3001`. Configuration: `JWT_KEY`, `MONGO_URI`, `MONGO_USR`, `MONGO_PWD`, optional `SERVER_PORT`. The root development launcher supplies localhost settings.

## Tests

From the repository root after installing dependencies and building common:

```bash
npm --prefix auth run typecheck
npm --prefix auth run test:ci
```

Route specs live in [test/routes](test/routes); [test/setup.ts](test/setup.ts) starts an isolated temporary MongoDB and defines the session helper. Vitest watch mode is `npm --prefix auth run test:watch`.

Uses the private [common package](../common/README.md) through `file:../common`; no npm publication is required. In the production Compose stack, auth is reached through nginx at `/api/users/*`.
