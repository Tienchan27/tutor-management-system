create table if not exists session_student_tuitions (
    id uuid primary key,
    session_id uuid not null references sessions(id),
    student_id uuid not null references users(id),
    tuition_at_log bigint not null,
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint uk_session_student_tuition unique (session_id, student_id)
);

