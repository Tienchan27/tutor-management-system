-- Idempotency / audit key for tuition payments (manual confirm today, webhook in Phase 2).
-- Additive only.

ALTER TABLE payments ADD COLUMN reference varchar(120);
CREATE UNIQUE INDEX uk_payments_reference ON payments(reference) WHERE reference IS NOT NULL;
