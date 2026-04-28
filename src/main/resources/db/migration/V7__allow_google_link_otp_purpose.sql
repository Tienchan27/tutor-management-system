-- No-op migration.
-- The legacy otp_verifications table has been removed entirely from the schema chain
-- because OTP runtime now lives in Redis. This file is kept to preserve the Flyway
-- version history without performing any DDL changes.

SELECT 1;
