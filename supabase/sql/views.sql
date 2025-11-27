create view if not exists public.payouts_pending_view as
select p.id as payout_id,
       s.id as salon_id,
       s.name as salon_name,
       p.period_start,
       p.period_end,
       p.amount,
       p.status,
       p.created_at
from public.payouts p
join public.salons s on s.id = p.salon_id
where p.status = 'pending';

create view if not exists public.delinquency_view as
select us.user_id,
       pr.email,
       us.plan_id,
       us.status,
       us.current_period_end,
       coalesce( (select count(*) from public.payments pay where pay.user_id = us.user_id and pay.status in ('failed','charged_back','cancelled')), 0) as payment_issues
from public.user_subscriptions us
join public.profiles pr on pr.id = us.user_id
where us.status in ('past_due','pending');

