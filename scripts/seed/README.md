# Demo seed data

Dev/demo-only SQL seed for presentations. **Wipes** classes, users (except re-created admin), sessions, invoices, payouts, and payment config, then loads a small scripted dataset.

## Prerequisites

- Docker stack running with Flyway applied: `docker compose up -d`
- Postgres container name: `postgres-db`

## Run

From repo root (PowerShell):

```powershell
.\scripts\seed\run-demo-seed.ps1
```

Or manually:

```powershell
docker compose stop app nginx
Get-Content scripts\seed\demo_seed.sql -Raw | docker exec -i postgres-db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose start app nginx
```

**Warning:** Do not run on production. The script `TRUNCATE`s domain tables.

## Credentials

| Role | Email | Password |
|------|-------|------------|
| Admin | `admin@example.com` | `Admin@123` |
| Tutors 1–5 | `tutor1-demo@tms.local` … `tutor5-demo@tms.local` | `Demo@123` |
| Students 1–12 | `student1-demo@tms.local` … `student12-demo@tms.local` | `Demo@123` |

Admin password hash is fixed in SQL (matches `.env.ci`). Tutor/student passwords use PostgreSQL `pgcrypto` `crypt('Demo@123', …)` (BCrypt-compatible with Spring).

## Edge-case map

### Tutors

| Tutor | Email | Demo scenario |
|-------|-------|----------------|
| Tutor 1 | `tutor1-demo@tms.local` | Bank + ACTIVE class Toán 12 A; 4 sessions; payout **LOCKED** with **PENDING** payout QR |
| Tutor 2 | `tutor2-demo@tms.local` | Bank + ACTIVE Anh 12 B; current payout **LOCKED** (no QR); **prior month PAID** |
| Tutor 3 | `tutor3-demo@tms.local` | Bank + own ACTIVE class; **REJECTED** marketplace application on Hóa 10 |
| Tutor 4 | `tutor4-demo@tms.local` | Bank + **PENDING** application on Hóa 10 (approve live in demo) |
| Tutor 5 | `tutor5-demo@tms.local` | **No bank account** → tutor onboarding gate on login |

### Students

| Student | Email | Demo scenario |
|---------|-------|----------------|
| s1–s3 | `student1-demo@tms.local` … `student3-demo@tms.local` | UNPAID invoice → **Pay** VietQR on Billing |
| s4 | `student4-demo@tms.local` | Invoice **PAID** (manual confirm already done) |
| s5–s6 | `student5-demo@tms.local`, `student6-demo@tms.local` | UNPAID (tutor2 class) |
| s7 | `student7-demo@tms.local` | Enrolled in Toán 12 A but **no sessions** → no invoice |
| s8 | `student8-demo@tms.local` | **Dual enrollment** (Toán + Anh); UNPAID invoice for Anh portion |
| s9 | `student9-demo@tms.local` | No phone/Facebook → **profile completion** gate |
| s10–s12 | `student10-demo@tms.local` … | Light enrollments (tutor3 / spare class) |

### Admin quick paths

- **Dashboard:** center account configured (no warning banner).
- **Classes → Hóa 10:** pending application from tutor4.
- **Student billing:** confirm unpaid invoices (s1, s5, …).
- **Payouts:** tutor1 Show QR (existing PENDING row); tutor2 confirm paid.

### Marketplace classes

- `Hóa 10 — chờ gia sư` (`AVAILABLE`) — pending + rejected applications.
- `Vật lý 11 — chờ gia sư` (`AVAILABLE`) — spare listing.

## Suggested demo flow (15 min)

1. Admin login → dashboard → Classes → approve tutor4 on Hóa 10 (optional).
2. Student1 → Billing → Pay (VietQR modal).
3. Admin → Student billing → Confirm received for student1.
4. Admin → Payouts → Show QR / Confirm paid for tutor1 & tutor2.
5. Tutor5 login → onboarding gate; Tutor1 → sessions list.

## Reset

Full reset: `docker compose down -v` then `docker compose up --build -d`, then re-run this seed.
