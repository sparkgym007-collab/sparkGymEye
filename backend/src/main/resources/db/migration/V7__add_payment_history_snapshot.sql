alter table payment
add column if not exists member_name varchar(160);

alter table payment
add column if not exists plan_name varchar(120);

alter table payment
add column if not exists payment_mode varchar(24) not null default 'UPI';

update payment payment_row
set member_name = member.name
from member
where payment_row.roll_no = member.roll_no
  and payment_row.member_name is null;

update payment
set plan_name = case
    when duration_months = 1 then '1 Month'
    else duration_months || ' Months'
end
where plan_name is null;
