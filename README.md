# Tutor Management System

Tutor Management System is a Spring Boot (Java 21) API + a React 19 web app built with **Vite** and **Tailwind CSS v4**.

Notifications and real-time updates (SSE) run **in-process** via a transactional DB outbox drained by scheduled dispatchers — there is **no message broker** (Kafka/Zookeeper were removed). This keeps the stack small and single-instance.

## Deployment model (single-entry Nginx)

Production-style deployment uses one public entrypoint. The stack is 5 containers: `nginx`, `app`, `postgres-db`, `redis`, `mailpit` (plus `pgadmin` under an opt-in profile).

- `nginx` serves the React static build (`frontend/dist`).
- `nginx` reverse proxies API requests from `/api/*` to Spring Boot.
- `app`, `postgres-db`, and `redis` stay on the internal Docker network.

This avoids routing conflicts between SPA routes (for example `/dashboard`) and API endpoints by using a clear API prefix (`/api`).

## One-command startup (prod-like)

Run from project root:

```powershell
docker compose up --build -d
```

Public URL:

- `http://localhost` -> React app via Nginx
- API is available under `http://localhost/api/*`

## Optional dev tooling profile

PgAdmin is not started by default. Run it only when needed:

```powershell
docker compose --profile dev-tools up -d pgadmin
```

PgAdmin URL:

- `http://localhost:5050`

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and fill in values (`.env` is not committed).

Key variables:

```env
GOOGLE_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD_HASH=...   # BCrypt hash for seeded admin login
DATABASE_URL=jdbc:postgresql://localhost:5433/tms_db
DATABASE_USERNAME=tms_user
DATABASE_PASSWORD=...
SERVER_PORT=8081
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost
MAIL_HOST=mailpit
MAIL_PORT=1025
```

Notes:

- In Docker deployment, app uses `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-db:5432/tms_db`.
- In Docker deployment, app SMTP is pinned by compose to `MAIL_HOST=mailpit` and `MAIL_PORT=1025`.
- Frontend production build uses `VITE_API_URL=/api` for same-origin API calls (passed as a Docker build arg by compose).
- `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in root `.env` must match.
- `JWT_SECRET` should be a strong secret (at least 32 bytes for HS256).
- Docker dev stack includes Mailpit for OTP delivery.
- Database schema is managed by **Flyway only** (`V1__init_schema.sql`); Hibernate uses `ddl-auto=validate` (no silent schema drift).
- After changing migrations locally, reset Postgres: `docker compose down -v` then `docker compose up --build -d`.

For non-Docker local backend run, use host SMTP values in root `.env`:

```env
MAIL_HOST=localhost
MAIL_PORT=1025
```

## OTP email in Docker dev

- Mailpit web UI: `http://localhost:8025`
- SMTP target used by app container: `mailpit:1025`
- Register/resend OTP is now fail-fast: if OTP email cannot be delivered, API returns an error instead of a false success message.

## Authentication flow (important)

- Register with email/password: `POST /auth/register`.
- Verify OTP from email: `POST /auth/verify-otp`.
- Login is only available after OTP verification activates the account.
- Google login: `POST /auth/google`.
- If a Google sign-in needs to be linked to an existing account, the backend uses an OTP link challenge (`POST /auth/google/verify-link-otp`).

## Security baseline in this deployment

- Only Nginx is publicly exposed.
- Postgres is internal (no host DB port exposure by default).
- PgAdmin is isolated under a non-default profile.
- Nginx adds baseline hardening headers and rate limits `/api/auth/*`.
- JWT auth is stateless; refresh token rotation remains enabled.
- `/admin/**` and `/dashboard/admin/**` require `ROLE_ADMIN`.
- Sensitive production defaults tightened:
  - `server.error.include-message=never` (unless overridden)
  - SQL logging off by default

## Frontend build

The frontend is built with **Vite** (not CRA). Scripts in `frontend/package.json`: `npm run dev` (dev server), `npm run build` (`tsc && vite build` → `frontend/dist`), `npm run preview`. TypeScript is `5.x`.

- If a lockfile drift occurs, run `npm install` inside `frontend/` and rebuild with `docker compose up --build -d`.
- The nginx image builds the frontend and serves `frontend/dist`; env is injected at build time via `VITE_*` build args.

## OAuth setup (Google)

Use your frontend public origin in Google Cloud Console:

- Authorized JavaScript origins:
  - `http://localhost`
  - `http://localhost:3000` (for local dev frontend)
- Authorized redirect URIs:
  - `http://localhost/auth/callback`
  - `http://localhost:3000/auth/callback`
  - production domain callback URI

Google requires exact URI matching and HTTPS in real production environments.
Also ensure Google Web Client ID in Google Cloud Console is the same one configured in both backend (`GOOGLE_CLIENT_ID`) and frontend (`VITE_GOOGLE_CLIENT_ID`).
