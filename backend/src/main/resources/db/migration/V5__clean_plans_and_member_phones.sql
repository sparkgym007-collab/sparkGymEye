update gym_plan
set name = '1 Month', amount = 600, active = true, updated_at = now()
where duration_months = 1;

update gym_plan
set name = '3 Months', amount = 1400, active = true, updated_at = now()
where duration_months = 3;

update gym_plan
set name = '6 Months', amount = 2600, active = true, updated_at = now()
where duration_months = 6;

delete from gym_plan
where duration_months not in (1, 3, 6);

delete from gym_plan
where id not in (
    select min(id)
    from gym_plan
    group by duration_months
);

create unique index if not exists idx_gym_plan_duration_unique on gym_plan (duration_months);

create unique index if not exists idx_member_phone_unique on member (phone);
