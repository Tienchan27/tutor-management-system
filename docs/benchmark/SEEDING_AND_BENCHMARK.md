## Seeding and benchmarking (Workload A)

This guide helps you:
- Seed a realistic dataset for sessions/payout/dashboard queries.
- Capture EXPLAIN output to present to a mentor.

### What you will seed (small profile)

- **Tutors**: 200 users  
  - Emails: `tutor10@gmail.com` → `tutor209@gmail.com`
  - Roles: **TUTOR + STUDENT** (both ACTIVE)
- **Students**: 5,000 users  
  - Emails: `student10@gmail.com` → `student5009@gmail.com`
  - Roles: **STUDENT** (ACTIVE)
- **Subjects**: 20
- **Classes**: 2,000 (owned by tutors)
- **Enrollments**: ~50,000 (25 students/class)
- **Sessions**: ~200,000 (100 sessions/class, spread across last 12 months)

### Prerequisites

- Docker installed and running
- `docker compose` works from the repo root

### 1) Start Postgres (and the app to run Flyway)

Run from repo root:

```powershell
docker compose up -d postgres-db
docker compose up -d --build app
```

Notes:
- The `app` container runs all Flyway migrations on startup (`V1` through the latest available migration).
- This ensures the schema exists before seeding.
- For large seed runs, it's recommended to stop the `app` container before executing the seed script to avoid DB locks from background jobs:
  - `docker compose stop app nginx`

### 2) Seed data (SQL bulk load)

Seed script:
- `scripts/seed/seed_bench_small.sql`

Run it inside the Postgres container (PowerShell-friendly):

```powershell
Get-Content scripts\seed\seed_bench_small.sql | docker exec -i postgres-db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

**Warning:** The bench seed script `TRUNCATE`s `users` and related tables. The Flyway-seeded admin account will be removed. To restore admin, run `docker compose down -v` and `docker compose up --build -d` again (fresh Flyway migrate), or re-seed only after a full DB reset.

Expected outcome:
- Seed completes successfully.
- A `VACUUM (ANALYZE)` runs at the end for accurate query plans.

### 3) Run benchmark queries (EXPLAIN)

Benchmark script:
- `scripts/seed/bench_queries.sql`

Run it:

```powershell
Get-Content scripts\seed\bench_queries.sql | docker exec -i postgres-db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### 4) What to look for in the output

`sessions` is a **regular (non-partitioned)** table. Benchmark value comes from indexes on `payroll_month`, `class_id`, and composite `(payroll_month, class_id)`.

#### A) Payroll month filter

In `count(*) WHERE payroll_month = ...`, look for index usage on `idx_sessions_payroll_month` or `idx_sessions_payroll_month_class_id` rather than a full sequential scan on large tables.

#### B) Index usage

For tutor session list query (join `sessions -> classes`), look for:
- Index scans / bitmap index scans on `sessions` and `classes`
- Reasonable buffer reads (lower is better)

### 5) Demo script for mentor (talk track)

1. Show `sessions` schema and indexes (`payroll_month`, `class_id`).
2. Seed ~200k sessions across 12 months.
3. Run EXPLAIN for a single `payroll_month` filter.
4. Highlight index usage on month filters.
5. Run the join query and show stable plans with `VACUUM (ANALYZE)` after seed.

### Notes / safety

- These scripts are for dev/learning environments only.
- The seed script truncates multiple tables (dev-only).
