# Demo seed data

Dev/demo-only SQL seed. **Wipes** classes/sessions/invoices/payouts (domain tables), then loads demo data in **English (ASCII)** to avoid Windows pipe encoding issues.

**Preserves** existing real users (e.g. Google admin). Only removes prior seed accounts (`admin@example.com`, `*@tms.local`).

## Prerequisites

- Docker stack running with Flyway applied: `docker compose up -d`
- Postgres container name: `postgres-db`

## Run

```powershell
.\scripts\seed\run-demo-seed.ps1
```

**Warning:** Dev/demo only. Resets billing/class/session data. Keeps your real admin.

## Credentials

| Role | Email | Password |
|------|-------|------------|
| Your Google admin (preserved) | `trandinhtien05@gmail.com` | (Google / existing) |
| Seed admin | `admin@example.com` | `Admin@123` |
| Tutors 1–5 | `tutor1-demo@tms.local` … | `Demo@123` |
| Students 1–12 | `student1-demo@tms.local` … | `Demo@123` |

## Subjects

| Subject | VND / hour |
|---------|------------|
| Math | 200,000 |
| English | 180,000 |
| Chemistry | 190,000 |
| Physics | 195,000 |

## Active classes

| Class | Tutor | Notes |
|-------|-------|-------|
| Math 12 A | tutor1 | Several students + student7 (no sessions) |
| English 12 B | tutor2 | student5, 6, 8 |
| Math 11 C | tutor3 | student10, 11 |
| Chemistry 10 / Physics 11 | — | AVAILABLE marketplace slots |

## Edge cases kept

| Account | Scenario |
|---------|----------|
| tutor5 | No bank → onboarding gate |
| student1 | UNPAID invoice → Pay VietQR |
| student4 | PAID sample invoice |
| student7 | Enrolled, no sessions → no invoice |
| student8 | Dual class |
| student9 | Profile completion gate |

## Suggested demo flow

1. Admin → Classes (English names) → approve pending marketplace application.
2. student1 → Billing → Pay.
3. Admin → Confirm payment / Payouts Show QR for tutor1.
