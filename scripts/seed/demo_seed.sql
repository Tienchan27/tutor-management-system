-- Demo dataset for Tutor Management System (dev/demo only).
-- Requires Flyway migrations applied.
-- Preserves existing real admins (e.g. Google admin on Flyway UUID aaaaaaaa-...).
-- Adds password admin admin@example.com + tutors/students @tms.local.
-- Passwords: admin@example.com Admin@123 | tutors/students Demo@123
-- IMPORTANT: ASCII-only text (English) to avoid Windows encoding corruption when piping SQL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---------------------------------------------------------------------------
-- Wipe domain data only (keep users / roles / user_providers)
-- ---------------------------------------------------------------------------
TRUNCATE TABLE
  payments,
  invoices,
  session_student_tuitions,
  session_financial_edit_audits,
  sessions,
  enrollments,
  tutor_class_applications,
  classes,
  subjects,
  tutor_payout_payments,
  tutor_payouts,
  tutor_bank_accounts,
  center_bank_account,
  bank_catalog,
  realtime_event_consumptions,
  realtime_events_outbox,
  notification_event_consumptions,
  notification_events_outbox,
  notifications,
  tutor_invitations,
  refresh_tokens
RESTART IDENTITY CASCADE;

-- Remove previous demo accounts only (idempotent). Never deletes real Google admin.
DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM users
  WHERE email = 'admin@example.com'
     OR email LIKE '%@tms.local'
);
DELETE FROM user_providers
WHERE user_id IN (
  SELECT id FROM users
  WHERE email = 'admin@example.com'
     OR email LIKE '%@tms.local'
);
DELETE FROM users
WHERE email = 'admin@example.com'
   OR email LIKE '%@tms.local';

-- Ensure roles exist (Flyway IDs). No-op if already present.
INSERT INTO roles (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'ADMIN'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'TUTOR'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'STUDENT')
ON CONFLICT (name) DO NOTHING;

-- Password admin gets a dedicated UUID (does not reclaim aaaaaaaa occupied by Google admin).
-- Google / preserved admin: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- Seed password admin:      bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

WITH pw AS (
  SELECT
    '$2a$10$j9EtjrW45kKmajXMxHMm6umffoWpaF.0akLh0rEd.oX0gIgnX3S8W'::varchar AS admin_hash,
    crypt('Demo@123', gen_salt('bf', 10)) AS demo_hash
)
INSERT INTO users (id, name, email, password, status, default_salary_rate, phone_number, facebook_url, created_at, updated_at)
SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Demo Admin', 'admin@example.com', pw.admin_hash, 'ACTIVE', 0.7500, '0900000001', NULL, NOW(), NOW() FROM pw
UNION ALL
SELECT 'b1000001-0000-4000-8000-000000000001'::uuid, 'Tutor One (Ready)', 'tutor1-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0901000001', 'https://facebook.com/tutor1', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b1000001-0000-4000-8000-000000000002'::uuid, 'Tutor Two (Payout mix)', 'tutor2-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0901000002', 'https://facebook.com/tutor2', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b1000001-0000-4000-8000-000000000003'::uuid, 'Tutor Three (Rejected app)', 'tutor3-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0901000003', 'https://facebook.com/tutor3', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b1000001-0000-4000-8000-000000000004'::uuid, 'Tutor Four (Pending app)', 'tutor4-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0901000004', 'https://facebook.com/tutor4', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b1000001-0000-4000-8000-000000000005'::uuid, 'Tutor Five (No bank)', 'tutor5-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0901000005', 'https://facebook.com/tutor5', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000001'::uuid, 'Student One', 'student1-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000001', 'https://facebook.com/student1', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000002'::uuid, 'Student Two', 'student2-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000002', 'https://facebook.com/student2', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000003'::uuid, 'Student Three', 'student3-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000003', 'https://facebook.com/student3', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000004'::uuid, 'Student Four (Paid)', 'student4-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000004', 'https://facebook.com/student4', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000005'::uuid, 'Student Five', 'student5-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000005', 'https://facebook.com/student5', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000006'::uuid, 'Student Six', 'student6-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000006', 'https://facebook.com/student6', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000007'::uuid, 'Student Seven (No sessions)', 'student7-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000007', 'https://facebook.com/student7', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000008'::uuid, 'Student Eight (Dual class)', 'student8-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000008', 'https://facebook.com/student8', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000009'::uuid, 'Student Nine (Profile gate)', 'student9-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, NULL, NULL, NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000010'::uuid, 'Student Ten', 'student10-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000010', 'https://facebook.com/student10', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000011'::uuid, 'Student Eleven', 'student11-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000011', 'https://facebook.com/student11', NOW(), NOW() FROM pw
UNION ALL
SELECT 'b2000001-0000-4000-8000-000000000012'::uuid, 'Student Twelve', 'student12-demo@tms.local', pw.demo_hash, 'ACTIVE', 0.7500, '0902000012', 'https://facebook.com/student12', NOW(), NOW() FROM pw;

INSERT INTO user_roles (id, user_id, role_id, status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, r.id, 'ACTIVE', NOW(), NOW()
FROM users u
JOIN roles r ON (
  (u.email = 'admin@example.com' AND r.name = 'ADMIN')
  OR (u.email LIKE 'tutor%-demo@tms.local' AND r.name = 'TUTOR')
  OR (u.email LIKE 'student%-demo@tms.local' AND r.name = 'STUDENT')
)
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- ---------------------------------------------------------------------------
-- Payments infra
-- ---------------------------------------------------------------------------
INSERT INTO bank_catalog (bin, code, short_name, name, logo_url, transfer_supported, lookup_supported, updated_at) VALUES
  ('970436', 'VCB', 'Vietcombank', 'Joint Stock Commercial Bank for Foreign Trade of Vietnam', NULL, TRUE, TRUE, NOW()),
  ('970422', 'MB', 'MB Bank', 'Military Commercial Joint Stock Bank', NULL, TRUE, TRUE, NOW());

INSERT INTO center_bank_account (id, bank_bin, bank_code, bank_name, account_number, account_holder_name, updated_at, updated_by)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  '970436', 'VCB', 'Vietcombank', '001122334455', 'TMS Center Demo',
  NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
);

INSERT INTO tutor_bank_accounts (id, user_id, bank_name, account_number, account_holder_name, bank_bin, bank_code, is_primary, is_verified, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b1000001-0000-4000-8000-000000000001'::uuid, 'Vietcombank', '1234567890', 'TUTOR ONE', '970436', 'VCB', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'b1000001-0000-4000-8000-000000000002'::uuid, 'Vietcombank', '2234567890', 'TUTOR TWO', '970436', 'VCB', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'b1000001-0000-4000-8000-000000000003'::uuid, 'MB Bank', '3234567890', 'TUTOR THREE', '970422', 'MB', TRUE, TRUE, NOW(), NOW()),
  (gen_random_uuid(), 'b1000001-0000-4000-8000-000000000004'::uuid, 'Vietcombank', '4234567890', 'TUTOR FOUR', '970436', 'VCB', TRUE, TRUE, NOW(), NOW());
-- tutor5: intentionally no bank account (onboarding gate)

-- ---------------------------------------------------------------------------
-- Subjects & classes (English/ASCII only)
-- ---------------------------------------------------------------------------
INSERT INTO subjects (id, name, default_price_per_hour) VALUES
  ('b3000001-0000-4000-8000-000000000001'::uuid, 'Math', 200000),
  ('b3000002-0000-4000-8000-000000000002'::uuid, 'English', 180000),
  ('b3000003-0000-4000-8000-000000000003'::uuid, 'Chemistry', 190000),
  ('b3000004-0000-4000-8000-000000000004'::uuid, 'Physics', 195000);

INSERT INTO classes (id, subject_id, tutor_id, price_per_hour, default_salary_rate, status, display_name, note, created_at) VALUES
  ('b4000001-0000-4000-8000-000000000001'::uuid, 'b3000003-0000-4000-8000-000000000003'::uuid, NULL, 190000, 0.7500, 'AVAILABLE', 'Chemistry 10 - awaiting tutor', 'Marketplace demo class', NOW() - interval '30 days'),
  ('b4000002-0000-4000-8000-000000000002'::uuid, 'b3000004-0000-4000-8000-000000000004'::uuid, NULL, 195000, 0.7500, 'AVAILABLE', 'Physics 11 - awaiting tutor', 'Spare marketplace class', NOW() - interval '20 days'),
  ('b4000003-0000-4000-8000-000000000003'::uuid, 'b3000001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, 200000, 0.7500, 'ACTIVE', 'Math 12 A', NULL, NOW() - interval '60 days'),
  ('b4000004-0000-4000-8000-000000000004'::uuid, 'b3000002-0000-4000-8000-000000000002'::uuid, 'b1000001-0000-4000-8000-000000000002'::uuid, 180000, 0.7500, 'ACTIVE', 'English 12 B', NULL, NOW() - interval '50 days'),
  ('b4000005-0000-4000-8000-000000000005'::uuid, 'b3000001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000003'::uuid, 200000, 0.7500, 'ACTIVE', 'Math 11 C', 'Tutor3 own class', NOW() - interval '40 days');

-- Marketplace applications
INSERT INTO tutor_class_applications (id, class_id, tutor_id, status, applied_at, reviewed_at, reviewed_by, rejection_reason) VALUES
  (gen_random_uuid(), 'b4000001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000003'::uuid, 'REJECTED', NOW() - interval '5 days', NOW() - interval '4 days', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Schedule conflict'),
  (gen_random_uuid(), 'b4000001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000004'::uuid, 'PENDING', NOW() - interval '2 days', NULL, NULL, NULL);

-- Enrollments
INSERT INTO enrollments (id, class_id, student_id, joined_at, left_at, status) VALUES
  -- Math 12 A (tutor1): s1-s4, s7 (no sessions), s8 (dual)
  (gen_random_uuid(), 'b4000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, NOW() - interval '45 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000002'::uuid, NOW() - interval '45 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000003'::uuid, NOW() - interval '45 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000004'::uuid, NOW() - interval '45 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000007'::uuid, NOW() - interval '30 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000008'::uuid, NOW() - interval '40 days', NULL, 'ACTIVE'),
  -- English 12 B (tutor2): s5, s6, s8
  (gen_random_uuid(), 'b4000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000005'::uuid, NOW() - interval '35 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000006'::uuid, NOW() - interval '35 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000008'::uuid, NOW() - interval '35 days', NULL, 'ACTIVE'),
  -- Math 11 C (tutor3): s10, s11
  (gen_random_uuid(), 'b4000005-0000-4000-8000-000000000005'::uuid, 'b2000001-0000-4000-8000-000000000010'::uuid, NOW() - interval '25 days', NULL, 'ACTIVE'),
  (gen_random_uuid(), 'b4000005-0000-4000-8000-000000000005'::uuid, 'b2000001-0000-4000-8000-000000000011'::uuid, NOW() - interval '25 days', NULL, 'ACTIVE'),
  -- Physics spare: s12 only
  (gen_random_uuid(), 'b4000002-0000-4000-8000-000000000002'::uuid, 'b2000001-0000-4000-8000-000000000012'::uuid, NOW() - interval '10 days', NULL, 'ACTIVE');

-- ---------------------------------------------------------------------------
-- Sessions (current month + tutor2 prior month)
-- Per-student tuition = price_per_hour * duration_hours
-- ---------------------------------------------------------------------------
INSERT INTO sessions (id, class_id, date, duration_hours, tuition_at_log, salary_rate_at_log, payroll_month, note, created_by, updated_by, created_at, updated_at)
SELECT * FROM (
  VALUES
    -- tutor1 / Math: 4 sessions, 2h, 4 students @ 400k each -> tuition_at_log 1_600_000
    ('b5000001-0000-4000-8000-000000000001'::uuid, 'b4000003-0000-4000-8000-000000000003'::uuid, (CURRENT_DATE - 20), 2.00::numeric, 1600000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000001'::uuid, NULL::uuid, NOW(), NOW()),
    ('b5000002-0000-4000-8000-000000000002'::uuid, 'b4000003-0000-4000-8000-000000000003'::uuid, (CURRENT_DATE - 15), 2.00::numeric, 1600000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000001'::uuid, NULL::uuid, NOW(), NOW()),
    ('b5000003-0000-4000-8000-000000000003'::uuid, 'b4000003-0000-4000-8000-000000000003'::uuid, (CURRENT_DATE - 10), 2.00::numeric, 1600000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000001'::uuid, NULL::uuid, NOW(), NOW()),
    ('b5000004-0000-4000-8000-000000000004'::uuid, 'b4000003-0000-4000-8000-000000000003'::uuid, (CURRENT_DATE - 5), 2.00::numeric, 1600000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000001'::uuid, NULL::uuid, NOW(), NOW()),
    -- tutor2 / English: 2 sessions current month, 3 students @ 270k -> 810_000
    ('b5000005-0000-4000-8000-000000000005'::uuid, 'b4000004-0000-4000-8000-000000000004'::uuid, (CURRENT_DATE - 12), 1.50::numeric, 810000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000002'::uuid, NULL::uuid, NOW(), NOW()),
    ('b5000006-0000-4000-8000-000000000006'::uuid, 'b4000004-0000-4000-8000-000000000004'::uuid, (CURRENT_DATE - 7), 1.50::numeric, 810000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000002'::uuid, NULL::uuid, NOW(), NOW()),
    -- tutor2 prior month PAID payout
    ('b5000007-0000-4000-8000-000000000007'::uuid, 'b4000004-0000-4000-8000-000000000004'::uuid, (date_trunc('month', CURRENT_DATE)::date - 10), 1.50::numeric, 810000::bigint, 0.7500::numeric, to_char(date_trunc('month', CURRENT_DATE) - interval '1 month', 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000002'::uuid, NULL::uuid, NOW(), NOW()),
    -- tutor3 / Math 11: 1 session
    ('b5000008-0000-4000-8000-000000000008'::uuid, 'b4000005-0000-4000-8000-000000000005'::uuid, (CURRENT_DATE - 8), 2.00::numeric, 800000::bigint, 0.7500::numeric, to_char(CURRENT_DATE, 'YYYY-MM'), NULL::varchar, 'b1000001-0000-4000-8000-000000000003'::uuid, NULL::uuid, NOW(), NOW())
) AS v(id, class_id, date, duration_hours, tuition_at_log, salary_rate_at_log, payroll_month, note, created_by, updated_by, created_at, updated_at);

-- Session student tuition lines
INSERT INTO session_student_tuitions (id, session_id, student_id, tuition_at_log, created_at, updated_at)
SELECT gen_random_uuid(), s.id, stu.id, line_tuition, NOW(), NOW()
FROM (
  VALUES
    ('b5000001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 400000::bigint),
    ('b5000001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000002'::uuid, 400000::bigint),
    ('b5000001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000003'::uuid, 400000::bigint),
    ('b5000001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000004'::uuid, 400000::bigint),
    ('b5000002-0000-4000-8000-000000000002'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 400000::bigint),
    ('b5000002-0000-4000-8000-000000000002'::uuid, 'b2000001-0000-4000-8000-000000000002'::uuid, 400000::bigint),
    ('b5000002-0000-4000-8000-000000000002'::uuid, 'b2000001-0000-4000-8000-000000000003'::uuid, 400000::bigint),
    ('b5000002-0000-4000-8000-000000000002'::uuid, 'b2000001-0000-4000-8000-000000000004'::uuid, 400000::bigint),
    ('b5000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 400000::bigint),
    ('b5000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000002'::uuid, 400000::bigint),
    ('b5000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000003'::uuid, 400000::bigint),
    ('b5000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000004'::uuid, 400000::bigint),
    ('b5000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 400000::bigint),
    ('b5000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000002'::uuid, 400000::bigint),
    ('b5000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000003'::uuid, 400000::bigint),
    ('b5000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000004'::uuid, 400000::bigint),
    ('b5000005-0000-4000-8000-000000000005'::uuid, 'b2000001-0000-4000-8000-000000000005'::uuid, 270000::bigint),
    ('b5000005-0000-4000-8000-000000000005'::uuid, 'b2000001-0000-4000-8000-000000000006'::uuid, 270000::bigint),
    ('b5000005-0000-4000-8000-000000000005'::uuid, 'b2000001-0000-4000-8000-000000000008'::uuid, 270000::bigint),
    ('b5000006-0000-4000-8000-000000000006'::uuid, 'b2000001-0000-4000-8000-000000000005'::uuid, 270000::bigint),
    ('b5000006-0000-4000-8000-000000000006'::uuid, 'b2000001-0000-4000-8000-000000000006'::uuid, 270000::bigint),
    ('b5000006-0000-4000-8000-000000000006'::uuid, 'b2000001-0000-4000-8000-000000000008'::uuid, 270000::bigint),
    ('b5000007-0000-4000-8000-000000000007'::uuid, 'b2000001-0000-4000-8000-000000000005'::uuid, 270000::bigint),
    ('b5000007-0000-4000-8000-000000000007'::uuid, 'b2000001-0000-4000-8000-000000000006'::uuid, 270000::bigint),
    ('b5000007-0000-4000-8000-000000000007'::uuid, 'b2000001-0000-4000-8000-000000000008'::uuid, 270000::bigint),
    ('b5000008-0000-4000-8000-000000000008'::uuid, 'b2000001-0000-4000-8000-000000000010'::uuid, 400000::bigint),
    ('b5000008-0000-4000-8000-000000000008'::uuid, 'b2000001-0000-4000-8000-000000000011'::uuid, 400000::bigint)
) AS rows(session_id, student_id, line_tuition)
JOIN sessions s ON s.id = rows.session_id
JOIN users stu ON stu.id = rows.student_id;

-- ---------------------------------------------------------------------------
-- Invoices (current month)
-- ---------------------------------------------------------------------------
INSERT INTO invoices (id, student_id, year_value, month_value, total_hours, total_amount, status, due_date, qr_ref, created_at)
VALUES
  ('b6000001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 8.00, 1600000, 'UNPAID', CURRENT_DATE + 15, 'HPDEMO001', NOW()),
  ('b6000002-0000-4000-8000-000000000002'::uuid, 'b2000001-0000-4000-8000-000000000002'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 8.00, 1600000, 'UNPAID', CURRENT_DATE + 15, 'HPDEMO002', NOW()),
  ('b6000003-0000-4000-8000-000000000003'::uuid, 'b2000001-0000-4000-8000-000000000003'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 8.00, 1600000, 'UNPAID', CURRENT_DATE + 15, 'HPDEMO003', NOW()),
  ('b6000004-0000-4000-8000-000000000004'::uuid, 'b2000001-0000-4000-8000-000000000004'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 8.00, 1600000, 'PAID', CURRENT_DATE + 15, 'HPDEMO004', NOW()),
  ('b6000005-0000-4000-8000-000000000005'::uuid, 'b2000001-0000-4000-8000-000000000005'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 3.00, 540000, 'UNPAID', CURRENT_DATE + 15, 'HPDEMO005', NOW()),
  ('b6000006-0000-4000-8000-000000000006'::uuid, 'b2000001-0000-4000-8000-000000000006'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 3.00, 540000, 'UNPAID', CURRENT_DATE + 15, 'HPDEMO006', NOW());
-- s7: no invoice (enrolled, no sessions)
-- s8 dual class: Math sessions skipped in seed lines + English 2 sessions = English billing only for simplicity
-- (Math sessions for s8 not seeded — dual-class edge is enrollment + English billing)
INSERT INTO invoices (id, student_id, year_value, month_value, total_hours, total_amount, status, due_date, qr_ref, created_at)
VALUES (
  'b6000008-0000-4000-8000-000000000008'::uuid,
  'b2000001-0000-4000-8000-000000000008'::uuid,
  EXTRACT(YEAR FROM CURRENT_DATE)::int,
  EXTRACT(MONTH FROM CURRENT_DATE)::int,
  3.00,
  540000,
  'UNPAID',
  CURRENT_DATE + 15,
  'HPDEMO008',
  NOW()
);

INSERT INTO payments (id, invoice_id, amount, method, status, paid_at, reference)
VALUES (
  'b7000004-0000-4000-8000-000000000004'::uuid,
  'b6000004-0000-4000-8000-000000000004'::uuid,
  1600000,
  'QR',
  'SUCCESS',
  NOW() - interval '2 days',
  'MANUAL:demo:b6000004'
);

-- ---------------------------------------------------------------------------
-- Tutor payouts
-- ---------------------------------------------------------------------------
INSERT INTO tutor_payouts (id, tutor_id, year_value, month_value, gross_revenue, net_salary, status, paid_at, paid_by, created_at, updated_at)
VALUES
  -- tutor1 current: 4 sessions x 1_600_000 gross -> 4_800_000 net
  ('b8000001-0000-4000-8000-000000000001'::uuid, 'b1000001-0000-4000-8000-000000000001'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 6400000, 4800000, 'LOCKED', NULL, NULL, NOW(), NOW()),
  -- tutor2 current: 2 x 810_000
  ('b8000002-0000-4000-8000-000000000002'::uuid, 'b1000001-0000-4000-8000-000000000002'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 1620000, 1215000, 'LOCKED', NULL, NULL, NOW(), NOW()),
  -- tutor2 prior month PAID
  ('b8000003-0000-4000-8000-000000000003'::uuid, 'b1000001-0000-4000-8000-000000000002'::uuid, EXTRACT(YEAR FROM date_trunc('month', CURRENT_DATE) - interval '1 month')::int, EXTRACT(MONTH FROM date_trunc('month', CURRENT_DATE) - interval '1 month')::int, 810000, 607500, 'PAID', NOW() - interval '20 days', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, NOW(), NOW()),
  -- tutor3 current OPEN (not closed in demo — optional; use LOCKED with small amount)
  ('b8000004-0000-4000-8000-000000000004'::uuid, 'b1000001-0000-4000-8000-000000000003'::uuid, EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, 800000, 600000, 'LOCKED', NULL, NULL, NOW(), NOW());

INSERT INTO tutor_payout_payments (id, tutor_payout_id, qr_ref, qr_payload, status, paid_at, created_at)
VALUES (
  'b9000001-0000-4000-8000-000000000001'::uuid,
  'b8000001-0000-4000-8000-000000000001'::uuid,
  'LUONGDEMO001',
  'DEMO-QR-PAYLOAD-TUTOR1-REGENERATE-VIA-UI-IF-NEEDED',
  'PENDING',
  NULL,
  NOW()
);

COMMIT;
