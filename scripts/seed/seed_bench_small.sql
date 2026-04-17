-- Seed benchmark dataset (small) for workload A (sessions/payout/dashboard).
--
-- Tutors:   tutor10@gmail.com   -> tutor209@gmail.com   (200)
-- Students: student10@gmail.com -> student5009@gmail.com (5000)
--
-- Tutor users get BOTH roles: TUTOR + STUDENT (ACTIVE).
-- Student users get role: STUDENT (ACTIVE).
--
-- This script is intended for dev/learning environments only.
-- It assumes schema is already migrated by Flyway.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional: keep seed idempotent-ish for repeated runs on an empty DB.
-- Clean core tables (FK order). Use CASCADE carefully in dev only.
TRUNCATE TABLE
  session_student_tuitions,
  session_financial_edit_audits,
  sessions,
  enrollments,
  tutor_class_applications,
  classes,
  subjects,
  user_roles,
  user_providers,
  refresh_tokens,
  notifications,
  tutor_payout_payments,
  tutor_payouts,
  tutor_bank_accounts,
  tutor_invitations,
  users,
  roles
RESTART IDENTITY CASCADE;

-- 1) Roles
INSERT INTO roles (id, name)
VALUES
  (gen_random_uuid(), 'ADMIN'),
  (gen_random_uuid(), 'TUTOR'),
  (gen_random_uuid(), 'STUDENT');

-- Capture role IDs for later inserts.
WITH role_ids AS (
  SELECT
    (SELECT id FROM roles WHERE name = 'TUTOR')   AS tutor_role_id,
    (SELECT id FROM roles WHERE name = 'STUDENT') AS student_role_id
)
-- 2) Users (tutors + students)
, tutors AS (
  INSERT INTO users (id, name, email, password, status, default_salary_rate, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    'Tutor ' || n,
    'tutor' || n || '@gmail.com',
    NULL,
    'ACTIVE',
    0.7500,
    now() - (random() * interval '365 days'),
    now()
  FROM generate_series(10, 209) AS n
  RETURNING id
)
, students AS (
  INSERT INTO users (id, name, email, password, status, default_salary_rate, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    'Student ' || n,
    'student' || n || '@gmail.com',
    NULL,
    'ACTIVE',
    0.7500,
    now() - (random() * interval '365 days'),
    now()
  FROM generate_series(10, 5009) AS n
  RETURNING id
)
-- 3) user_roles
INSERT INTO user_roles (id, user_id, role_id, status, revoked_reason, updated_by, created_at, updated_at)
SELECT gen_random_uuid(), t.id, r.tutor_role_id, 'ACTIVE', NULL::text, NULL::uuid, now(), now()
FROM tutors t CROSS JOIN role_ids r
UNION ALL
SELECT gen_random_uuid(), t.id, r.student_role_id, 'ACTIVE', NULL::text, NULL::uuid, now(), now()
FROM tutors t CROSS JOIN role_ids r
UNION ALL
SELECT gen_random_uuid(), s.id, r.student_role_id, 'ACTIVE', NULL::text, NULL::uuid, now(), now()
FROM students s CROSS JOIN role_ids r;

-- 4) Subjects (20)
INSERT INTO subjects (id, name, default_price_per_hour)
SELECT gen_random_uuid(), 'Subject ' || gs, (100000 + (random() * 300000))::bigint
FROM generate_series(1, 20) gs;

-- 5) Classes (2000) with tutor owners
INSERT INTO classes (id, subject_id, tutor_id, price_per_hour, default_salary_rate, status, created_at, note, display_name)
SELECT
  gen_random_uuid(),
  (SELECT id FROM subjects ORDER BY random() LIMIT 1),
  (SELECT u.id
   FROM users u
   JOIN user_roles ur ON ur.user_id = u.id
   JOIN roles r ON r.id = ur.role_id
   WHERE r.name = 'TUTOR' AND ur.status = 'ACTIVE'
   ORDER BY random()
   LIMIT 1),
  (120000 + (random() * 300000))::bigint,
  0.7500,
  'ACTIVE',
  now() - (random() * interval '180 days'),
  NULL,
  NULL
FROM generate_series(1, 2000) gs;

-- 6) Enrollments (~50k): 25 students/class
INSERT INTO enrollments (id, class_id, student_id, joined_at, left_at, status)
SELECT
  gen_random_uuid(),
  c.id,
  s.id,
  now() - (random() * interval '180 days'),
  NULL,
  'ACTIVE'
FROM (SELECT id FROM classes ORDER BY random() LIMIT 2000) c
JOIN LATERAL (
  SELECT u.id
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'STUDENT' AND ur.status = 'ACTIVE'
  ORDER BY random()
  LIMIT 25
) s ON true
ON CONFLICT (class_id, student_id) DO NOTHING;

-- 7) Sessions (~200k): 100 sessions/class across the last 12 months
-- Insert into parent sessions; Postgres routes to partitions by payroll_month.
INSERT INTO sessions (id, class_id, date, duration_hours, tuition_at_log, salary_rate_at_log, payroll_month, note, created_by, updated_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  c.id,
  (current_date - (random() * 365)::int),
  round((1 + random() * 2)::numeric, 2),
  (100000 + (random() * 500000))::bigint,
  0.7500,
  to_char(date_trunc('month', (current_date - (random() * 365)::int)::timestamp), 'YYYY-MM'),
  NULL,
  c.tutor_id,
  NULL,
  now() - (random() * interval '365 days'),
  now()
FROM (SELECT id, tutor_id FROM classes ORDER BY random() LIMIT 2000) c
JOIN generate_series(1, 100) gs ON true;

VACUUM (ANALYZE);

