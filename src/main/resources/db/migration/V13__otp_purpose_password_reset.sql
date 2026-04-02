-- Allow PASSWORD_RESET in otp_verifications audit (aligned with OtpPurpose enum).

DO $$
DECLARE con RECORD;
BEGIN
    FOR con IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'otp_verifications'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%purpose%'
    LOOP
        EXECUTE format('ALTER TABLE otp_verifications DROP CONSTRAINT IF EXISTS %I', con.conname);
    END LOOP;
END $$;

ALTER TABLE otp_verifications
    ADD CONSTRAINT ck_otp_verifications_purpose
        CHECK (purpose IN ('REGISTER', 'GOOGLE_LINK', 'PASSWORD_RESET'));
