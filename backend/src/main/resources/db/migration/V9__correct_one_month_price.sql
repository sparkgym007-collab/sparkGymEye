-- Correct the current one-month price without rewriting payment history.
update gym_plan
set amount = 500, updated_at = now()
where duration_months = 1;

-- Only replace the old standard fee and a full unpaid old-price balance.
-- Preserve zero balances and any individually adjusted balances.
update member
set monthly_fee = 500,
    amount_due = case when amount_due = 600 then 500 else amount_due end,
    updated_at = now()
where lower(trim(plan_name)) in ('1 month', '1 months')
  and monthly_fee = 600;
