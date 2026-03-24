# Tutor Management System

Tutor Management System is a Spring Boot API + React web app.

## Deployment model (single-entry Nginx)

Production-style deployment uses one public entrypoint:

- `nginx` serves the React static app.
- `nginx` reverse proxies API requests from `/api/*` to Spring Boot.
- `app` and `postgres-db` stay on internal Docker network.

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

Runtime application config comes from root `.env` (not committed):

```env
GOOGLE_CLIENT_ID=...
REACT_APP_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
DATABASE_URL=jdbc:postgresql://localhost:5433/tms_db
DATABASE_USERNAME=tms_user
DATABASE_PASSWORD=tms_password
SERVER_PORT=8081
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost
MAIL_HOST=mailpit
MAIL_PORT=1025
```

Notes:

- In Docker deployment, app uses `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-db:5432/tms_db`.
- In Docker deployment, app SMTP is pinned by compose to `MAIL_HOST=mailpit` and `MAIL_PORT=1025`.
- Frontend production build uses `REACT_APP_API_URL=/api` for same-origin API calls.
- `GOOGLE_CLIENT_ID` and `REACT_APP_GOOGLE_CLIENT_ID` in root `.env` must match.
- `JWT_SECRET` should be a strong secret (at least 32 bytes for HS256).
- Docker dev stack includes Mailpit for OTP delivery.

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
- If backend returns `EMAIL_CONFLICT`, use password login first, then link Google from an authenticated flow (`POST /auth/google/link`).

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

## Troubleshooting

- Docker build fails at frontend `npm ci` with `ERESOLVE`:
  - This project currently uses `react-scripts@5`, which is compatible with `typescript@4.x`.
  - Keep `typescript` pinned to `4.9.5` in `frontend/package.json`.
  - If lockfile drift occurs, run `npm install` inside `frontend/` and rebuild with `docker compose up --build -d`.

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
Also ensure Google Web Client ID in Google Cloud Console is the same one configured in both backend (`GOOGLE_CLIENT_ID`) and frontend (`REACT_APP_GOOGLE_CLIENT_ID`).
