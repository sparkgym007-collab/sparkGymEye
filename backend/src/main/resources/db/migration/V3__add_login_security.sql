alter table app_user add column if not exists password_hash varchar(255);
alter table app_user add column if not exists reset_token_hash varchar(255);
alter table app_user add column if not exists reset_token_expires_at timestamp with time zone;
alter table app_user add column if not exists last_login_at timestamp with time zone;

create table if not exists auth_session (
    id bigserial primary key,
    app_user_id bigint not null references app_user(id) on delete cascade,
    token_hash varchar(255) not null unique,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_auth_session_token_hash on auth_session (token_hash);
create index if not exists idx_auth_session_user_id on auth_session (app_user_id);

create unique index if not exists idx_app_user_phone_unique on app_user (phone);
create unique index if not exists idx_member_phone_unique on member (phone);
