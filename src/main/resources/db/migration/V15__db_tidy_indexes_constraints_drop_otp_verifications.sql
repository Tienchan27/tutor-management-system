-- DB tidy v1: add missing indexes, tighten constraints.
-- Scope:
--  (1) Index hot join/filter paths
--  (3) payroll_month format enforcement (keep string)
--  (4) money VND (BIGINT) non-negative checks
-- Note: legacy otp_verifications is no longer part of the schema chain (OTP uses Redis),
-- so this migration intentionally does not reference that table.

-- (3) Normalize payroll_month values like YYYY-M -> YYYY-0M before adding CHECK.
UPDATE sessions
SET payroll_month = split_part(payroll_month, '-', 1) || '-' || lpad(split_part(payroll_month, '-', 2), 2, '0')
WHERE payroll_month ~ '^\d{4}-[1-9]$';

-- Enforce payroll_month as YYYY-MM (industry standard for a YearMonth string).
ALTER TABLE sessions
    DROP CONSTRAINT IF EXISTS ck_sessions_payroll_month_format;
ALTER TABLE sessions
    ADD CONSTRAINT ck_sessions_payroll_month_format
        CHECK (payroll_month ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- (4) Money consistency: prevent negative VND amounts.
ALTER TABLE subjects
    DROP CONSTRAINT IF EXISTS ck_subjects_default_price_per_hour_non_negative;
ALTER TABLE subjects
    ADD CONSTRAINT ck_subjects_default_price_per_hour_non_negative
        CHECK (default_price_per_hour >= 0);

ALTER TABLE classes
    DROP CONSTRAINT IF EXISTS ck_classes_price_per_hour_non_negative;
ALTER TABLE classes
    ADD CONSTRAINT ck_classes_price_per_hour_non_negative
        CHECK (price_per_hour >= 0);

ALTER TABLE sessions
    DROP CONSTRAINT IF EXISTS ck_sessions_tuition_at_log_non_negative;
ALTER TABLE sessions
    ADD CONSTRAINT ck_sessions_tuition_at_log_non_negative
        CHECK (tuition_at_log >= 0);

ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS ck_payments_amount_non_negative;
ALTER TABLE payments
    ADD CONSTRAINT ck_payments_amount_non_negative
        CHECK (amount >= 0);

ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS ck_invoices_total_amount_non_negative;
ALTER TABLE invoices
    ADD CONSTRAINT ck_invoices_total_amount_non_negative
        CHECK (total_amount >= 0);

ALTER TABLE tutor_payouts
    DROP CONSTRAINT IF EXISTS ck_tutor_payouts_gross_revenue_non_negative;
ALTER TABLE tutor_payouts
    ADD CONSTRAINT ck_tutor_payouts_gross_revenue_non_negative
        CHECK (gross_revenue >= 0);

ALTER TABLE tutor_payouts
    DROP CONSTRAINT IF EXISTS ck_tutor_payouts_net_salary_non_negative;
ALTER TABLE tutor_payouts
    ADD CONSTRAINT ck_tutor_payouts_net_salary_non_negative
        CHECK (net_salary >= 0);

-- (1) Add missing indexes for common joins/filters.
CREATE INDEX IF NOT EXISTS idx_classes_tutor_id ON classes(tutor_id);

CREATE INDEX IF NOT EXISTS idx_sessions_payroll_month_class_id ON sessions(payroll_month, class_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id_status ON enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id_status ON enrollments(class_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_sst_session_id ON session_student_tuitions(session_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_status ON user_roles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_status ON user_roles(role_id, status);

CREATE INDEX IF NOT EXISTS idx_tca_tutor_status ON tutor_class_applications(tutor_id, status);
