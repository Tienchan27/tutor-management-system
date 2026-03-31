-- Convert money columns from numeric(.,2) to BIGINT (VND integer).
-- Amounts in existing data are already VND-like (often with .00), so ROUND/cast is safe.

ALTER TABLE subjects
    ALTER COLUMN default_price_per_hour TYPE BIGINT
    USING ROUND(default_price_per_hour)::bigint;

ALTER TABLE classes
    ALTER COLUMN price_per_hour TYPE BIGINT
    USING ROUND(price_per_hour)::bigint;

ALTER TABLE sessions
    ALTER COLUMN tuition_at_log TYPE BIGINT
    USING ROUND(tuition_at_log)::bigint;

ALTER TABLE invoices
    ALTER COLUMN total_amount TYPE BIGINT
    USING ROUND(total_amount)::bigint;

ALTER TABLE payments
    ALTER COLUMN amount TYPE BIGINT
    USING ROUND(amount)::bigint;

ALTER TABLE tutor_payouts
    ALTER COLUMN gross_revenue TYPE BIGINT
    USING ROUND(gross_revenue)::bigint;

ALTER TABLE tutor_payouts
    ALTER COLUMN net_salary TYPE BIGINT
    USING ROUND(net_salary)::bigint;

