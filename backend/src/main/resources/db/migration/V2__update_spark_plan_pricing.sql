insert into gym_plan (name, duration_months, amount, active)
values
    ('1 Month', 1, 600, true),
    ('3 Months', 3, 1400, true),
    ('6 Months', 6, 2600, true)
on conflict do nothing;

update gym_plan
set amount = 600, duration_months = 1, active = true, updated_at = now()
where lower(name) in ('1 month', '1 months');

update gym_plan
set amount = 1400, duration_months = 3, active = true, updated_at = now()
where lower(name) in ('3 month', '3 months');

update gym_plan
set amount = 2600, duration_months = 6, active = true, updated_at = now()
where lower(name) in ('6 month', '6 months');

update gym_plan
set active = false, updated_at = now()
where lower(name) not in ('1 month', '1 months', '3 month', '3 months', '6 month', '6 months');
