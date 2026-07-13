-- Align tutor bank_name with bank_catalog.short_name (varchar 120).
ALTER TABLE tutor_bank_accounts
    ALTER COLUMN bank_name TYPE varchar(120);
