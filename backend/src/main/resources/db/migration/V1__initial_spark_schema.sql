create table if not exists app_user (
    id bigserial primary key,
    full_name varchar(160) not null,
    phone varchar(32) not null unique,
    email varchar(180),
    role varchar(32) not null check (role in ('ADMIN', 'TRAINER', 'MEMBER')),
    active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists gym_plan (
    id bigserial primary key,
    name varchar(120) not null,
    duration_months integer not null check (duration_months > 0),
    amount numeric(12, 2) not null check (amount >= 0),
    active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists member (
    id bigserial primary key,
    roll_no varchar(40) not null unique,
    name varchar(160) not null,
    phone varchar(32) not null unique,
    role varchar(32) not null default 'MEMBER' check (role in ('ADMIN', 'TRAINER', 'MEMBER')),
    plan_name varchar(120) not null,
    plan_start_date date not null,
    due_date date not null,
    monthly_fee numeric(12, 2) not null,
    amount_due numeric(12, 2) not null default 0,
    status varchar(32) not null default 'ACTIVE' check (status in ('ACTIVE', 'DUE_SOON', 'OVERDUE', 'PAUSED')),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists attendance (
    id bigserial primary key,
    roll_no varchar(40) not null,
    member_name varchar(160) not null,
    attendance_date date not null default current_date,
    check_in_time time not null default current_time,
    marked_by varchar(80) not null default 'TRAINER',
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_attendance_date on attendance (attendance_date);
create index if not exists idx_attendance_roll_no on attendance (roll_no);

create table if not exists payment (
    id bigserial primary key,
    roll_no varchar(40) not null,
    amount numeric(12, 2) not null check (amount >= 0),
    duration_months integer not null default 1 check (duration_months > 0),
    paid_at date not null default current_date,
    received_by varchar(80) not null default 'ADMIN',
    created_at timestamp with time zone not null default now()
);

create index if not exists idx_payment_roll_no on payment (roll_no);
create index if not exists idx_payment_paid_at on payment (paid_at);

create table if not exists report_settings (
    id bigserial primary key,
    report_type varchar(80) not null default 'OVERDUE_MEMBERS',
    enabled boolean not null default true,
    day_of_week varchar(16) not null default 'THURSDAY',
    report_time time not null default '10:00:00',
    recipient_email varchar(180) not null,
    cc_email varchar(180),
    whatsapp_enabled boolean not null default false,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists generated_report (
    id bigserial primary key,
    report_type varchar(80) not null,
    generated_at timestamp with time zone not null default now(),
    file_name varchar(220),
    storage_path varchar(420),
    status varchar(60) not null,
    sent_to varchar(420)
);

create table if not exists notice (
    id bigserial primary key,
    title varchar(160) not null,
    body text not null,
    audience varchar(32) not null default 'ALL',
    active boolean not null default true,
    created_by varchar(80),
    created_at timestamp with time zone not null default now()
);

insert into gym_plan (name, duration_months, amount)
select '1 month', 1, 1500
where not exists (select 1 from gym_plan where name = '1 month');

insert into gym_plan (name, duration_months, amount)
select '2 months', 2, 3000
where not exists (select 1 from gym_plan where name = '2 months');

insert into gym_plan (name, duration_months, amount)
select '3 months', 3, 4500
where not exists (select 1 from gym_plan where name = '3 months');

insert into gym_plan (name, duration_months, amount)
select '6 months', 6, 8000
where not exists (select 1 from gym_plan where name = '6 months');

insert into app_user (full_name, phone, email, role)
select 'SPARK Owner', '+919876543210', 'owner@sparkgym.in', 'ADMIN'
where not exists (select 1 from app_user where phone = '+919876543210');

insert into app_user (full_name, phone, email, role)
select 'SPARK Trainer', '+919876543211', 'trainer@sparkgym.in', 'TRAINER'
where not exists (select 1 from app_user where phone = '+919876543211');

insert into report_settings (recipient_email, cc_email)
select 'owner@sparkgym.in', 'trainer@sparkgym.in'
where not exists (select 1 from report_settings where report_type = 'OVERDUE_MEMBERS');
