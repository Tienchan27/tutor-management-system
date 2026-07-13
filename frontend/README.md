# Frontend Overview

React 19 frontend for the Tutor Management System. The app is built with Vite and talks to the Spring Boot API through the shared `/api` prefix in the Nginx deployment.

## Environment

Create `frontend/.env` for local development:

```env
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Use `VITE_API_URL=/api` when the frontend is served behind the repo's Nginx reverse proxy. For a standalone local Vite server, point it at the backend origin if you are not using the proxy.

## Scripts

Run from `frontend/`:

- `npm run dev` starts the Vite dev server.
- `npm run build` runs TypeScript and creates the production build in `dist/`.
- `npm test` runs the frontend test suite.

## Routes

- `/` authentication page for sign in, sign up, OTP, password reset, and Google sign-in.
- `/profile-completion` profile completion flow for newly activated users.
- `/tutor-onboarding` tutor bank-account onboarding flow.
- `/app/*` authenticated application shell for role-specific dashboards and workflows.

## Session And Role Access

The browser session is backed by httpOnly auth cookies. Access tokens are JWTs; refresh tokens are opaque secrets whose hashes live server-side. Local storage keeps non-secret user metadata only. Role access is refreshed from `GET /users/me/access`, which returns the server-authoritative active roles, active role, and onboarding flags.

When a multi-role user switches role, the backend issues a token scoped to that active role. Frontend route guards should refetch access metadata after role-change realtime events.
