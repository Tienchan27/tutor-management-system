-- Soft-transition: tutors no longer require admin verification for bank accounts.
-- Mark existing unverified tutor bank accounts as verified to avoid "pending" dead-ends.

UPDATE tutor_bank_accounts
SET is_verified = TRUE,
    verified_at = COALESCE(verified_at, NOW()),
    verified_by = NULL
WHERE is_verified = FALSE;

