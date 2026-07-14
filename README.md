# Tutor Management System

Tutor Management System is a Spring Boot (Java 21) API + a React 19 web app built with **Vite** and **Tailwind CSS v4**.

Notifications and real-time updates (SSE) run **in-process** via a transactional DB outbox drained by scheduled dispatchers — there is **no message broker** (Kafka/Zookeeper were removed). This keeps the stack small and single-instance.

## Deployment model (single-entry Nginx)

Production-style deployment uses one public entrypoint. The stack is 5 containers: `nginx`, `app`, `postgres-db`, `redis`, `mailpit` (plus `pgadmin` under an opt-in profile).

- `nginx` serves the React static build (`frontend/dist`).
- `nginx` reverse proxies API requests from `/api/*` to Spring Boot.
- `app`, `postgres-db`, and `redis` stay on the internal Docker network.

This avoids routing conflicts between SPA routes (for example `/app/dashboard`) and API endpoints by using a clear API prefix (`/api`).

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
- Database schema is managed by **Flyway migrations** (`V1` through `V7` at the time of writing); Hibernate uses `ddl-auto=validate` (no silent schema drift).
- CI rehearses Flyway + compose via the `compose-smoke` job (copies committed `.env.ci` dummies, `docker compose up --build`, waits for healthy app, asserts latest Flyway version `7`).
- After changing migrations locally, reset Postgres: `docker compose down -v` then `docker compose up --build -d`.

## Demo seed (presentations)

Load loginable demo users (5 tutors, 12 students, payments edge cases):

```powershell
.\scripts\seed\run-demo-seed.ps1
```

See [scripts/seed/README.md](scripts/seed/README.md) for credentials and scenario map. Dev/demo only — wipes domain data.

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
- Access and refresh tokens are set as **httpOnly cookies**.
- Access tokens are JWTs scoped by `activeRole`.
- Refresh tokens are opaque random secrets, stored server-side only as SHA-256 hashes with their active-role scope.
- Auth responses may include token fields for API-client compatibility, but browser code should treat the cookie session plus `/users/me/access` as the source of truth.
- Multi-role users operate with one active role at a time. The access token's `activeRole` claim is enforced by the backend security filter, so a token scoped to `ADMIN` does not also authorize `TUTOR` endpoints until the user switches role.
- The frontend refreshes authoritative session metadata from `GET /users/me/access`, including active roles, active role, profile-completion state, and tutor-onboarding state.

### Student tuition payments (VietQR)

- Students pay at **`/app/student/billing`** (menu **Billing**): open an unpaid invoice → **Pay** → scan VietQR with a banking app.
- Legacy SPA paths `/app/student/payments` and `/app/student/invoices` redirect to billing.
- Pay is blocked until an admin configures the **center receiving account** (`/app/admin/center-account`). Confirmation of received transfers remains a manual admin step on Student billing.

## Security baseline in this deployment

- Only Nginx is publicly exposed.
- Postgres is internal (no host DB port exposure by default).
- PgAdmin is isolated under a non-default profile.
- Nginx rate limits: `/api/auth/*` at `10r/m` (`auth_limit`); `/api/payouts/`, `/api/sessions/`, and `/api/admin/` at `30r/m` (`money_limit`, burst 20).
- Access-token auth is stateless JWT; refresh token rotation is stateful via hashed opaque refresh tokens.
- Redis: OTP verification is **fail-closed** (Redis errors block OTP flows). Refresh-token blacklist is **fail-open** (Redis errors do not block refresh); DB `revoked` + rotation remain authoritative. Warn codes: `REFRESH_BLACKLIST_CHECK_FAILED` / `REFRESH_BLACKLIST_STORE_FAILED`.
- SSE connect rate-limit IP uses `request.getRemoteAddr()` after Tomcat RemoteIpValve (`server.forward-headers-strategy` + `trusted-proxies` for Docker/private ranges only). Nginx already sets `X-Forwarded-*`; the app does not parse raw `X-Forwarded-For`.
- Backend role checks use the token's active role as the security scope. `/admin/**` requires `ROLE_ADMIN`; tutor/student routes require their matching active role.
- Unauthenticated / forbidden responses from the security filter chain use the same JSON envelope as API errors: `{ "code", "message", "timestamp" }` (`UNAUTHENTICATED` / `FORBIDDEN`).
- Sensitive production defaults tightened:
  - `server.error.include-message=never` (unless overridden)
  - SQL logging off by default

### Cookie auth, CORS, and CSRF

Auth cookies are set by the API (`CookieUtils`):

- `accessToken`: `httpOnly`, `Secure`, `SameSite=Strict`, path `/`, ~15 minutes.
- `refreshToken`: `httpOnly`, `Secure`, `SameSite=Strict`, path `/auth/refresh`, ~30 days.

`Secure` requires HTTPS in real browsers. Production is expected behind TLS (or a TLS-terminating proxy). Local HTTP may need a documented cookie override if cookies do not stick.

CSRF protection is **disabled** in Spring Security on purpose for the current deployment model:

- Browser and API share one public origin via Nginx (`/` SPA + `/api/*`).
- Cookies use `SameSite=Strict`, so cross-site navigations do not send them.
- CORS is an allowlist (`CORS_ALLOWED_ORIGINS`) with `allowCredentials=true` for local Vite (`http://localhost:3000`) and the nginx origin.

If the frontend and API are later split across different sites, add CSRF tokens for unsafe methods (or a same-origin BFF) before relying on cookie auth alone.

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
