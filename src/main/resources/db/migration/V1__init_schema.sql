-- Tutor Management System consolidated baseline schema.
-- OTP is stored in Redis; no otp_verifications table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Core identity
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    password varchar(255),
    status varchar(40) NOT NULL,
    default_salary_rate numeric(5,4) NOT NULL DEFAULT 0.7500,
    phone_number varchar(20),
    facebook_url varchar(255),
    parent_phone varchar(20),
    address text,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL
);

CREATE TABLE roles (
    id uuid PRIMARY KEY,
    name varchar(50) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    role_id uuid NOT NULL REFERENCES roles(id),
    status varchar(20) NOT NULL,
    revoked_reason varchar(255),
    updated_by uuid REFERENCES users(id),
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE user_providers (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    provider varchar(50) NOT NULL,
    provider_id varchar(255) NOT NULL,
    CONSTRAINT uk_user_provider UNIQUE (user_id, provider),
    CONSTRAINT uk_provider_provider_id UNIQUE (provider, provider_id)
);

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash varchar(64) NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamp NOT NULL,
    revoked boolean NOT NULL DEFAULT FALSE,
    revoked_at timestamp,
    ip_address varchar(45),
    user_agent varchar(512),
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutor_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL UNIQUE,
    status varchar(20) NOT NULL,
    invited_by uuid NOT NULL REFERENCES users(id),
    invited_user_id uuid REFERENCES users(id),
    accepted_at timestamp,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Tutoring domain
-- ---------------------------------------------------------------------------

CREATE TABLE subjects (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    default_price_per_hour bigint NOT NULL,
    CONSTRAINT ck_subjects_default_price_per_hour_non_negative CHECK (default_price_per_hour >= 0)
);

CREATE TABLE classes (
    id uuid PRIMARY KEY,
    subject_id uuid NOT NULL REFERENCES subjects(id),
    tutor_id uuid REFERENCES users(id),
    price_per_hour bigint NOT NULL,
    default_salary_rate numeric(5,4) NOT NULL DEFAULT 0.7500,
    status varchar(50) NOT NULL,
    display_name varchar(255),
    note text,
    created_at timestamp NOT NULL,
    CONSTRAINT ck_classes_price_per_hour_non_negative CHECK (price_per_hour >= 0)
);

CREATE TABLE enrollments (
    id uuid PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES classes(id),
    student_id uuid NOT NULL REFERENCES users(id),
    joined_at timestamp NOT NULL,
    left_at timestamp,
    status varchar(50) NOT NULL,
    CONSTRAINT uk_class_student UNIQUE (class_id, student_id)
);

CREATE TABLE tutor_class_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL,
    applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp,
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason text,
    CONSTRAINT uk_tutor_class_application_class_tutor UNIQUE (class_id, tutor_id)
);

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
    CONSTRAINT ck_sessions_payroll_month_format CHECK (payroll_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT ck_sessions_tuition_at_log_non_negative CHECK (tuition_at_log >= 0)
);

CREATE TABLE session_student_tuitions (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id),
    student_id uuid NOT NULL REFERENCES users(id),
    tuition_at_log bigint NOT NULL,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT uk_session_student_tuition UNIQUE (session_id, student_id)
);

CREATE TABLE session_financial_edit_audits (
    id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES sessions(id),
    edited_by uuid NOT NULL REFERENCES users(id),
    field_name varchar(100) NOT NULL,
    old_value varchar(255) NOT NULL,
    new_value varchar(255) NOT NULL,
    reason varchar(255),
    created_at timestamp NOT NULL
);

-- ---------------------------------------------------------------------------
-- Billing (retained for future use)
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
    id uuid PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES users(id),
    year_value integer NOT NULL,
    month_value integer NOT NULL,
    total_hours numeric(10,2) NOT NULL,
    total_amount bigint NOT NULL,
    status varchar(50) NOT NULL,
    due_date date NOT NULL,
    created_at timestamp NOT NULL,
    CONSTRAINT uk_student_invoice UNIQUE (student_id, year_value, month_value),
    CONSTRAINT ck_invoices_total_amount_non_negative CHECK (total_amount >= 0)
);

CREATE TABLE payments (
    id uuid PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES invoices(id),
    amount bigint NOT NULL,
    method varchar(50) NOT NULL,
    status varchar(50) NOT NULL,
    paid_at timestamp,
    CONSTRAINT ck_payments_amount_non_negative CHECK (amount >= 0)
);

-- ---------------------------------------------------------------------------
-- Notifications & payouts
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    type varchar(60) NOT NULL,
    title varchar(150) NOT NULL,
    content varchar(1000) NOT NULL,
    is_read boolean NOT NULL DEFAULT FALSE,
    created_at timestamp NOT NULL
);

CREATE TABLE tutor_payouts (
    id uuid PRIMARY KEY,
    tutor_id uuid NOT NULL REFERENCES users(id),
    year_value integer NOT NULL,
    month_value integer NOT NULL,
    gross_revenue bigint NOT NULL,
    net_salary bigint NOT NULL,
    status varchar(20) NOT NULL,
    paid_at timestamp,
    paid_by uuid REFERENCES users(id),
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT uk_tutor_payout UNIQUE (tutor_id, year_value, month_value),
    CONSTRAINT ck_tutor_payouts_gross_revenue_non_negative CHECK (gross_revenue >= 0),
    CONSTRAINT ck_tutor_payouts_net_salary_non_negative CHECK (net_salary >= 0)
);

CREATE TABLE tutor_payout_payments (
    id uuid PRIMARY KEY,
    tutor_payout_id uuid NOT NULL REFERENCES tutor_payouts(id),
    qr_ref varchar(120) NOT NULL UNIQUE,
    qr_payload varchar(1000) NOT NULL,
    status varchar(20) NOT NULL,
    paid_at timestamp,
    created_at timestamp NOT NULL
);

CREATE TABLE tutor_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name varchar(50) NOT NULL,
    account_number varchar(30) NOT NULL,
    account_holder_name varchar(100) NOT NULL,
    is_primary boolean NOT NULL DEFAULT TRUE,
    is_verified boolean NOT NULL DEFAULT FALSE,
    verified_at timestamp,
    verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Notification/realtime outbox & idempotency
-- ---------------------------------------------------------------------------

CREATE TABLE notification_events_outbox (
    id uuid PRIMARY KEY,
    event_type varchar(80) NOT NULL,
    recipient_user_id uuid NOT NULL REFERENCES users(id),
    entity_ref varchar(120),
    payload_json text NOT NULL,
    correlation_id varchar(80),
    status varchar(20) NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamp,
    created_at timestamp NOT NULL,
    published_at timestamp,
    last_error varchar(500)
);

CREATE TABLE notification_event_consumptions (
    id uuid PRIMARY KEY,
    event_id uuid NOT NULL,
    consumer_name varchar(80) NOT NULL,
    processed_at timestamp NOT NULL,
    CONSTRAINT uk_event_consumer UNIQUE (event_id, consumer_name)
);

CREATE TABLE realtime_events_outbox (
    id uuid PRIMARY KEY,
    event_type varchar(80) NOT NULL,
    scope varchar(80) NOT NULL,
    context_ref varchar(120),
    payload_json text NOT NULL,
    correlation_id varchar(80),
    status varchar(20) NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamp,
    created_at timestamp NOT NULL,
    published_at timestamp,
    last_error varchar(500)
);

CREATE TABLE realtime_event_consumptions (
    id uuid PRIMARY KEY,
    event_id uuid NOT NULL,
    consumer_name varchar(80) NOT NULL,
    processed_at timestamp NOT NULL,
    CONSTRAINT uk_rt_event_consumer UNIQUE (event_id, consumer_name)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_tutor_invitations_status ON tutor_invitations(status);
CREATE INDEX idx_tutor_invitations_invited_by ON tutor_invitations(invited_by);
CREATE INDEX idx_classes_tutor_id ON classes(tutor_id);
CREATE INDEX idx_enrollments_student_id_status ON enrollments(student_id, status);
CREATE INDEX idx_enrollments_class_id_status ON enrollments(class_id, status);
CREATE INDEX idx_tutor_class_applications_status ON tutor_class_applications(status);
CREATE INDEX idx_tutor_class_applications_class_id ON tutor_class_applications(class_id);
CREATE INDEX idx_tca_tutor_status ON tutor_class_applications(tutor_id, status);
CREATE INDEX idx_sessions_payroll_month ON sessions(payroll_month);
CREATE INDEX idx_sessions_class_date ON sessions(class_id, date);
CREATE INDEX idx_sessions_payroll_month_class_id ON sessions(payroll_month, class_id);
CREATE INDEX idx_sst_session_id ON session_student_tuitions(session_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);
CREATE INDEX idx_payouts_year_month ON tutor_payouts(year_value, month_value);
CREATE INDEX idx_tutor_bank_accounts_user_id ON tutor_bank_accounts(user_id);
CREATE INDEX idx_tutor_bank_accounts_is_primary ON tutor_bank_accounts(is_primary);
CREATE INDEX idx_tutor_bank_accounts_is_verified ON tutor_bank_accounts(is_verified);
CREATE UNIQUE INDEX idx_one_primary_per_user ON tutor_bank_accounts(user_id) WHERE is_primary = TRUE;
CREATE INDEX idx_notif_outbox_status_next_attempt ON notification_events_outbox(status, next_attempt_at);
CREATE INDEX idx_notif_outbox_recipient_created ON notification_events_outbox(recipient_user_id, created_at);
CREATE INDEX idx_rt_outbox_status_next_attempt ON realtime_events_outbox(status, next_attempt_at);
CREATE INDEX idx_rt_outbox_scope_created ON realtime_events_outbox(scope, created_at);
CREATE INDEX idx_user_roles_user_status ON user_roles(user_id, status);
CREATE INDEX idx_user_roles_role_status ON user_roles(role_id, status);

-- ---------------------------------------------------------------------------
-- Demo subjects (optional product defaults)
-- ---------------------------------------------------------------------------

INSERT INTO subjects (id, name, default_price_per_hour)
SELECT gen_random_uuid(), 'SAT Math', 180000
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE lower(name) = lower('SAT Math'));

INSERT INTO subjects (id, name, default_price_per_hour)
SELECT gen_random_uuid(), 'SAT Verbal', 230000
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE lower(name) = lower('SAT Verbal'));

-- ---------------------------------------------------------------------------
-- Seed roles & default admin (Flyway placeholders)
-- ---------------------------------------------------------------------------

INSERT INTO roles (id, name)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');

INSERT INTO roles (id, name)
SELECT '22222222-2222-2222-2222-222222222222'::uuid, 'TUTOR'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'TUTOR');

INSERT INTO roles (id, name)
SELECT '33333333-3333-3333-3333-333333333333'::uuid, 'STUDENT'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'STUDENT');

INSERT INTO users (id, name, email, password, status, default_salary_rate, created_at, updated_at)
SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'System Admin',
    '${default_admin_email}',
    '${default_admin_password_hash}',
    'ACTIVE',
    0.7500,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = '${default_admin_email}'
);

UPDATE users
SET
    name = 'System Admin',
    status = 'ACTIVE',
    password = CASE
        WHEN password IS NULL OR BTRIM(password) = '' THEN '${default_admin_password_hash}'
        ELSE password
    END,
    updated_at = NOW()
WHERE email = '${default_admin_email}';

INSERT INTO user_roles (id, user_id, role_id, status, revoked_reason, updated_by, created_at, updated_at)
SELECT
    ('00000000-0000-0000-0000-' || SUBSTRING(MD5(u.id::text || '-' || r.name), 1, 12))::uuid,
    u.id,
    r.id,
    'ACTIVE',
    NULL,
    u.id,
    NOW(),
    NOW()
FROM users u
JOIN roles r ON r.name IN ('ADMIN', 'TUTOR', 'STUDENT')
WHERE u.email = '${default_admin_email}'
  AND NOT EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = u.id
        AND ur.role_id = r.id
  );
