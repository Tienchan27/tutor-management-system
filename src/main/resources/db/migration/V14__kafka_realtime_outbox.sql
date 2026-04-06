-- Kafka realtime outbox (durable client events) + idempotency tracking.

create table if not exists realtime_events_outbox (
    id uuid primary key,
    event_type varchar(80) not null,
    scope varchar(80) not null,
    context_ref varchar(120),
    payload_json text not null,
    correlation_id varchar(80),
    status varchar(20) not null,
    attempts integer not null default 0,
    next_attempt_at timestamp,
    created_at timestamp not null,
    published_at timestamp,
    last_error varchar(500)
);

create index if not exists idx_rt_outbox_status_next_attempt on realtime_events_outbox(status, next_attempt_at);
create index if not exists idx_rt_outbox_scope_created on realtime_events_outbox(scope, created_at);

create table if not exists realtime_event_consumptions (
    id uuid primary key,
    event_id uuid not null,
    consumer_name varchar(80) not null,
    processed_at timestamp not null,
    constraint uk_rt_event_consumer unique (event_id, consumer_name)
);

