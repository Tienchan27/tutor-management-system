-- Benchmark / demo queries (workload A).
-- Run after seed_bench_small.sql.

\echo '--- Pick a target payroll_month and tutor_id automatically'

-- Pick a month that exists.
WITH m AS (
  SELECT max(payroll_month) AS payroll_month FROM sessions
),
tutor_pick AS (
  SELECT c.tutor_id AS tutor_id
  FROM classes c
  WHERE c.tutor_id IS NOT NULL
  ORDER BY random()
  LIMIT 1
)
SELECT
  (SELECT payroll_month FROM m) AS payroll_month,
  (SELECT tutor_id FROM tutor_pick) AS tutor_id;

\echo '--- A) Partition pruning sanity (should hit only one partition)'
\echo 'EXPLAIN count(*) by payroll_month'

EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*)
FROM sessions
WHERE payroll_month = (SELECT max(payroll_month) FROM sessions);

\echo '--- B) Tutor sessions list pattern (join sessions -> classes, filter tutor + payrollMonth)'
\echo 'Emulates findByTutorClassTutorIdAndPayrollMonth(tutorId, payrollMonth, Pageable)'

EXPLAIN (ANALYZE, BUFFERS)
WITH params AS (
  SELECT
    (SELECT max(payroll_month) FROM sessions) AS payroll_month,
    (SELECT c.tutor_id FROM classes c WHERE c.tutor_id IS NOT NULL ORDER BY random() LIMIT 1) AS tutor_id
)
SELECT s.id, s.class_id, s.date, s.duration_hours, s.tuition_at_log, s.salary_rate_at_log, s.payroll_month
FROM sessions s
JOIN classes c ON c.id = s.class_id
JOIN params p ON true
WHERE s.payroll_month = p.payroll_month
  AND c.tutor_id = p.tutor_id
ORDER BY s.date DESC
LIMIT 50;

\echo '--- C) Monthly payroll aggregation (group by tutor, count distinct classes)'
\echo 'Emulates countDistinctClassesByTutorForPayrollMonth(...) style query'

EXPLAIN (ANALYZE, BUFFERS)
WITH params AS (
  SELECT (SELECT max(payroll_month) FROM sessions) AS payroll_month
)
SELECT c.tutor_id, count(distinct s.class_id) AS distinct_classes, sum(s.tuition_at_log) AS gross_tuition_vnd
FROM sessions s
JOIN classes c ON c.id = s.class_id
JOIN params p ON true
WHERE s.payroll_month = p.payroll_month
  AND c.tutor_id IS NOT NULL
GROUP BY c.tutor_id
ORDER BY gross_tuition_vnd DESC
LIMIT 50;

\echo '--- Done'

