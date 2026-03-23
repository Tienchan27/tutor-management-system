-- Add contact information fields to users table
ALTER TABLE users
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN facebook_url VARCHAR(255),
ADD COLUMN parent_phone VARCHAR(20),
ADD COLUMN address TEXT;

-- Add check constraint: at least phone or facebook must be provided (enforced at application level)
COMMENT ON COLUMN users.phone_number IS 'User phone number - at least phone or facebook required';
COMMENT ON COLUMN users.facebook_url IS 'User Facebook profile URL - at least phone or facebook required';
COMMENT ON COLUMN users.parent_phone IS 'Optional parent/guardian phone number';
COMMENT ON COLUMN users.address IS 'Optional user address';

-- Create tutor_bank_accounts table
CREATE TABLE tutor_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by UUID,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tutor_bank_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bank_verified_by FOREIGN KEY (verified_by)
        REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_tutor_bank_accounts_user_id ON tutor_bank_accounts(user_id);
CREATE INDEX idx_tutor_bank_accounts_is_primary ON tutor_bank_accounts(is_primary);
CREATE INDEX idx_tutor_bank_accounts_is_verified ON tutor_bank_accounts(is_verified);

-- Unique constraint: only one primary account per user
CREATE UNIQUE INDEX idx_one_primary_per_user
ON tutor_bank_accounts(user_id)
WHERE is_primary = TRUE;

-- Comments for documentation
COMMENT ON TABLE tutor_bank_accounts IS 'Bank account information for tutors to receive payouts';
COMMENT ON COLUMN tutor_bank_accounts.bank_name IS 'Bank name (e.g., VCB, Techcombank, MBBank)';
COMMENT ON COLUMN tutor_bank_accounts.account_number IS 'Bank account number';
COMMENT ON COLUMN tutor_bank_accounts.account_holder_name IS 'Account holder name for verification';
COMMENT ON COLUMN tutor_bank_accounts.is_primary IS 'Primary account for payouts';
COMMENT ON COLUMN tutor_bank_accounts.is_verified IS 'Whether admin has verified this account';
COMMENT ON COLUMN tutor_bank_accounts.verified_by IS 'Admin user who verified this account';
COMMENT ON COLUMN tutor_bank_accounts.notes IS 'Admin notes about verification';
