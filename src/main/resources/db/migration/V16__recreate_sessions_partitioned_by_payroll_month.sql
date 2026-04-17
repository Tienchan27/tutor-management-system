-- Recreate sessions as a partitioned table by payroll month (dev/học only).
-- NOTE: This migration DROPs data in sessions and dependent tables.

-- Drop dependent tables first (FK -> sessions).
DROP TABLE IF EXISTS session_student_tuitions;
DROP TABLE IF EXISTS session_financial_edit_audits;
DROP TABLE IF EXISTS sessions;

-- Parent partitioned table.
CREATE TABLE sessions (
    id uuid PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES classes(id),
    date date NOT NULL,
    duration_hours numeric(5,2) NOT NULL,
    tuition_at_log bigint NOT NULL,
    salary_rate_at_log numeric(5,4) NOT NULL,
    payroll_month varchar(7) NOT NULL,
    note varchar(1000),
    created_by uuid NOT NULL REFERENCES users(id),
    updated_by uuid REFERENCES users(id),
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT ck_sessions_payroll_month_format
        CHECK (payroll_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT ck_sessions_tuition_at_log_non_negative
        CHECK (tuition_at_log >= 0)
) PARTITION BY RANGE (to_date(payroll_month || '-01', 'YYYY-MM-DD'));

-- Create monthly partitions for a reasonable learning window (36 months back, 6 months forward).
DO $$
DECLARE
  start_month date := date_trunc('month', current_date) - interval '36 months';
  end_month   date := date_trunc('month', current_date) + interval '6 months';
  m date;
  next_m date;
  part_name text;
BEGIN
  m := start_month;
  WHILE m <= end_month LOOP
    next_m := (m + interval '1 month')::date;
    part_name := format('sessions_%s', to_char(m, 'YYYY_MM'));
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF sessions FOR VALUES FROM (%L) TO (%L);',
      part_name,
      m,
      next_m
    );
    m := next_m;
  END LOOP;
END $$;

-- Safety net for any out-of-window inserts.
CREATE TABLE IF NOT EXISTS sessions_default
    PARTITION OF sessions DEFAULT;

-- Partitioned indexes (created per partition by Postgres).
CREATE INDEX IF NOT EXISTS idx_sessions_payroll_month ON sessions(payroll_month);
CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON sessions(class_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_payroll_month_class_id ON sessions(payroll_month, class_id);

-- Recreate dependent tables.
CREATE TABLE IF NOT EXISTS session_student_tuitions (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id),
    student_id uuid NOT NULL REFERENCES users(id),
    tuition_at_log bigint NOT NULL,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT uk_session_student_tuition UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_sst_session_id ON session_student_tuitions(session_id);

CREATE TABLE IF NOT EXISTS session_financial_edit_audits (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id),
    edited_by uuid NOT NULL REFERENCES users(id),
    field_name varchar(100) NOT NULL,
    old_value varchar(255) NOT NULL,
    new_value varchar(255) NOT NULL,
    reason varchar(255),
    created_at timestamp NOT NULL
);

