insert into payment (
    roll_no,
    member_name,
    plan_name,
    amount,
    duration_months,
    paid_at,
    payment_mode,
    received_by
)
select
    member.roll_no,
    member.name,
    member.plan_name,
    member.monthly_fee,
    case
        when lower(member.plan_name) like '6 month%' then 6
        when lower(member.plan_name) like '3 month%' then 3
        when lower(member.plan_name) like '2 month%' then 2
        else 1
    end,
    member.plan_start_date,
    'UPI',
    'ADMIN'
from member
where member.monthly_fee > 0
  and member.plan_start_date is not null
  and not exists (
      select 1
      from payment
      where payment.roll_no = member.roll_no
        and payment.plan_name = member.plan_name
        and payment.amount = member.monthly_fee
        and payment.paid_at = member.plan_start_date
  );
