create table if not exists users (
    id uuid primary key,
    name varchar(100) not null,
    email varchar(255) not null unique,
    password varchar(255),
    status varchar(40) not null,
    default_salary_rate numeric(5,4) not null default 0.7500,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table if not exists roles (
    id uuid primary key,
    name varchar(50) not null unique
);

create table if not exists user_roles (
    id uuid primary key,
    user_id uuid not null references users(id),
    role_id uuid not null references roles(id),
    status varchar(20) not null,
    revoked_reason varchar(255),
    updated_by uuid references users(id),
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint uk_user_role unique (user_id, role_id)
);

create table if not exists user_providers (
    id uuid primary key,
    user_id uuid not null references users(id),
    provider varchar(50) not null,
    provider_id varchar(255) not null,
    constraint uk_user_provider unique (user_id, provider),
    constraint uk_provider_provider_id unique (provider, provider_id)
);

create table if not exists subjects (
    id uuid primary key,
    name varchar(100) not null,
    default_price_per_hour numeric(10,2) not null
);

create table if not exists classes (
    id uuid primary key,
    subject_id uuid not null references subjects(id),
    tutor_id uuid not null references users(id),
    price_per_hour numeric(10,2) not null,
    default_salary_rate numeric(5,4) not null default 0.7500,
    status varchar(50) not null,
    created_at timestamp not null
);

create table if not exists enrollments (
    id uuid primary key,
    class_id uuid not null references classes(id),
    student_id uuid not null references users(id),
    joined_at timestamp not null,
    left_at timestamp,
    status varchar(50) not null,
    constraint uk_class_student unique (class_id, student_id)
);

create table if not exists sessions (
    id uuid primary key,
    class_id uuid not null references classes(id),
    date date not null,
    duration_hours numeric(5,2) not null,
    tuition_at_log numeric(10,2) not null,
    salary_rate_at_log numeric(5,4) not null,
    payroll_month varchar(7) not null,
    note varchar(1000),
    created_by uuid not null references users(id),
    updated_by uuid references users(id),
    created_at timestamp not null,
    updated_at timestamp not null
);

create table if not exists invoices (
    id uuid primary key,
    student_id uuid not null references users(id),
    year integer not null,
    month integer not null,
    total_hours numeric(10,2) not null,
    total_amount numeric(10,2) not null,
    status varchar(50) not null,
    due_date date not null,
    created_at timestamp not null,
    constraint uk_student_invoice unique (student_id, year, month)
);

create table if not exists payments (
    id uuid primary key,
    invoice_id uuid not null references invoices(id),
    amount numeric(10,2) not null,
    method varchar(50) not null,
    status varchar(50) not null,
    paid_at timestamp
);

create table if not exists notifications (
    id uuid primary key,
    user_id uuid not null references users(id),
    type varchar(60) not null,
    title varchar(150) not null,
    content varchar(1000) not null,
    is_read boolean not null default false,
    created_at timestamp not null
);

create table if not exists tutor_payouts (
    id uuid primary key,
    tutor_id uuid not null references users(id),
    year integer not null,
    month integer not null,
    gross_revenue numeric(12,2) not null,
    net_salary numeric(12,2) not null,
    status varchar(20) not null,
    paid_at timestamp,
    paid_by uuid references users(id),
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint uk_tutor_payout unique (tutor_id, year, month)
);

create table if not exists tutor_payout_payments (
    id uuid primary key,
    tutor_payout_id uuid not null references tutor_payouts(id),
    qr_ref varchar(120) not null unique,
    qr_payload varchar(1000) not null,
    status varchar(20) not null,
    paid_at timestamp,
    created_at timestamp not null
);

create table if not exists session_financial_edit_audits (
    id uuid primary key,
    session_id uuid not null references sessions(id),
    edited_by uuid not null references users(id),
    field_name varchar(100) not null,
    old_value varchar(255) not null,
    new_value varchar(255) not null,
    reason varchar(255),
    created_at timestamp not null
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_sessions_payroll_month on sessions(payroll_month);
create index if not exists idx_sessions_class_date on sessions(class_id, date);
create index if not exists idx_notifications_user_created on notifications(user_id, created_at);
create index if not exists idx_payouts_year_month on tutor_payouts(year, month);
