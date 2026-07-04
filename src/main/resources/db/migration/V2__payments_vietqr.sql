-- Phase 1 payments: self-generated VietQR + manual confirmation.
-- Additive only (V1 is immutable; Hibernate runs with ddl-auto=validate).

-- ---------------------------------------------------------------------------
-- Bank catalog (seeded from vietqr.io via an admin sync action, not at runtime)
-- ---------------------------------------------------------------------------
CREATE TABLE bank_catalog (
    bin                varchar(6) PRIMARY KEY,
    code               varchar(20) NOT NULL,
    short_name         varchar(120) NOT NULL,
    name               varchar(255) NOT NULL,
    logo_url           varchar(500),
    transfer_supported boolean NOT NULL DEFAULT FALSE,
    lookup_supported   boolean NOT NULL DEFAULT FALSE,
    updated_at         timestamp NOT NULL
);

-- ---------------------------------------------------------------------------
-- Center receiving account (single-row config; decoupled from admin's personal
-- bank account, admin-editable)
-- ---------------------------------------------------------------------------
CREATE TABLE center_bank_account (
    id                  uuid PRIMARY KEY,
    bank_bin            varchar(6) NOT NULL,
    bank_code           varchar(20),
    bank_name           varchar(255) NOT NULL,
    account_number      varchar(30) NOT NULL,
    account_holder_name varchar(100) NOT NULL,
    updated_at          timestamp NOT NULL,
    updated_by          uuid REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- Bank BIN on tutor payout accounts (nullable: existing rows have none; a BIN
-- is required only to generate a real payout VietQR).
-- ---------------------------------------------------------------------------
ALTER TABLE tutor_bank_accounts ADD COLUMN bank_bin varchar(6);
ALTER TABLE tutor_bank_accounts ADD COLUMN bank_code varchar(20);

-- ---------------------------------------------------------------------------
-- Reconciliation key for tuition invoices (payout side already has qr_ref).
-- ---------------------------------------------------------------------------
ALTER TABLE invoices ADD COLUMN qr_ref varchar(40);
CREATE UNIQUE INDEX uk_invoices_qr_ref ON invoices(qr_ref) WHERE qr_ref IS NOT NULL;
