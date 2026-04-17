## Seeding and benchmarking (Workload A)

This guide helps you:
- Seed a realistic dataset for sessions/payout/dashboard queries.
- Demonstrate Postgres partition pruning on `sessions` (partitioned by `payroll_month`).
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
- The `app` container runs Flyway migrations on startup.
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

#### A) Partition pruning proof

In the first EXPLAIN (`count(*) WHERE payroll_month = ...`), you want to see the planner scanning only one partition, for example:
- `sessions_2026_04` (or whatever month it picked)

You should NOT see scans across many `sessions_YYYY_MM` partitions for that query.

#### B) Index usage

For tutor session list query (join `sessions -> classes`), look for:
- Index scans / bitmap index scans on the partitioned `sessions` indexes
- Reasonable buffer reads (lower is better)

### 5) Demo script for mentor (talk track)

1. Show that `sessions` is partitioned by month (schema / migration `V16__...`).
2. Seed 200k sessions across 12 months.
3. Run EXPLAIN for a single month.
4. Highlight that Postgres prunes partitions and scans only one month partition.
5. Run the join query and show it stays within the same month partition and uses indexes.

### Notes / safety

- These scripts are for dev/learning environments only.
- The seed script truncates multiple tables (dev-only).

