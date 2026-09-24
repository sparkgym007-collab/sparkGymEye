-- Owner-requested correction of historical collections to current plan prices.
-- Retain the previous amount for each changed receipt for traceability.
create table payment_price_correction_v10 (
    payment_id bigint primary key,
    previous_amount numeric(12, 2) not null,
    corrected_amount numeric(12, 2) not null,
    corrected_at timestamp with time zone not null default now()
);

insert into payment_price_correction_v10 (payment_id, previous_amount, corrected_amount)
select id, amount,
       case duration_months when 1 then 500 when 3 then 1400 when 6 then 2600 end
from payment
where duration_months in (1, 3, 6)
  and amount <> case duration_months when 1 then 500 when 3 then 1400 when 6 then 2600 end;

update payment
set amount = (
    select corrected_amount
    from payment_price_correction_v10
    where payment_id = payment.id
)
where id in (select payment_id from payment_price_correction_v10);
