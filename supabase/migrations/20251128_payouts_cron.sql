begin;

create or replace function public.compute_payouts_period(p_start timestamptz, p_end timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_rows int; 
begin
  delete from public.payouts where period_start = p_start and period_end = p_end;

  insert into public.payouts(salon_id, amount, period_start, period_end, status)
  select v.salon_id,
         coalesce(
           sum(
             floor(
               (pl.price::numeric / nullif(coalesce(pl.monthly_credits, pl.cuts_per_month, 1), 0)) * 0.8
             )
           ),
           0
         ) as amt_cents,
         p_start,
         p_end,
         'pending'
  from (
    select c.used_by_salon_id as salon_id, c.user_id as user_id, c.used_at as used_at
    from public.codes c
    where c.status = 'used' and c.used_by_salon_id is not null and c.used_at between p_start and p_end
  ) v
  join public.user_subscriptions us on us.user_id = v.user_id and us.status = 'active' and us.current_period_start <= v.used_at and us.current_period_end >= v.used_at
  join public.plans pl on pl.id = us.plan_id
  group by v.salon_id;

  get diagnostics v_rows = row_count;
  return jsonb_build_object('ok', true, 'payouts_created', v_rows);
end;
$$;

grant execute on function public.compute_payouts_period(timestamptz, timestamptz) to authenticated;

create or replace function public.run_monthly_payouts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_start timestamptz; v_end timestamptz; v_res jsonb;
begin
  v_start := date_trunc('month', now());
  v_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');
  v_res := public.compute_payouts_period(v_start, v_end);
  return v_res;
end;
$$;

grant execute on function public.run_monthly_payouts() to authenticated;

-- optional: schedule monthly at 03:00 on day 1
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('payouts_monthly', '0 3 1 * *', 'select public.run_monthly_payouts()');
  end if;
end $$;

commit;

begin;

create or replace function public.list_common_users()
returns table(id uuid, email text, full_name text, role text)
language sql
security definer
set search_path = public
as $$
  with roles as (
    select ur.user_id, ur.role from public.user_roles ur
  )
  select
    p.id,
    coalesce(p.email, au.email) as email,
    coalesce(p.full_name, p.name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', coalesce(p.email, au.email)) as full_name,
    coalesce(r.role, p.role, 'user') as role
  from public.profiles p
  join auth.users au on au.id = p.id
  left join roles r on r.user_id = p.id
  where coalesce(r.role, p.role, 'user') not in ('admin','owner','salon_owner')
  order by full_name asc;
$$;

grant execute on function public.list_common_users() to authenticated;

commit;

-- List affiliates for a salon owner with cycle-aware used counts
begin;

drop function if exists public.affiliates_for_owner(uuid);

create function public.affiliates_for_owner(p_owner uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  affiliated_at timestamptz,
  used_count int,
  period_start timestamptz,
  period_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare v_salon uuid;
begin
  select id into v_salon from public.salons where owner_id = p_owner limit 1;
  if v_salon is null then
    return;
  end if;

  return query
  select p.id as user_id,
         coalesce(p.full_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') as full_name,
         p.email,
         ua.updated_at as affiliated_at,
         coalesce(cnt.used_count, 0) as used_count,
         us.current_period_start as period_start,
         us.current_period_end as period_end
  from public.user_affiliations ua
  join public.profiles p on p.id = ua.user_id
  join auth.users au on au.id = p.id
  left join lateral (
    select us.current_period_start, us.current_period_end
    from public.user_subscriptions us
    where us.user_id = ua.user_id and us.status = 'active'
    order by us.current_period_end desc
    limit 1
  ) us on true
  left join lateral (
    select count(*)::int as used_count
    from public.codes c
    where c.user_id = ua.user_id
      and c.used_by_salon_id = v_salon
      and (c.status = 'used' or c.used = true)
      and (us.current_period_start is null or (c.used_at between us.current_period_start and us.current_period_end))
  ) cnt on true
  where ua.salon_id = v_salon
  order by ua.updated_at desc;
end;
$$;

grant execute on function public.affiliates_for_owner(uuid) to authenticated;

commit;

begin;

-- Ensure visit_logs has monetary columns used by reporting functions
alter table public.visit_logs add column if not exists amount numeric(10,2);
alter table public.visit_logs add column if not exists salon_amount numeric(10,2);
alter table public.visit_logs add column if not exists platform_amount numeric(10,2);
alter table public.visit_logs add column if not exists created_at timestamptz default now();
alter table public.visit_logs add column if not exists visited_at timestamptz;

commit;

begin;
do $$
begin
  -- Social
  if exists (select 1 from public.plans where name = 'Social') then
    update public.plans set price = 5999, monthly_credits = 2, interval = 'month', active = true where name = 'Social';
  else
    insert into public.plans(name, price, monthly_credits, interval, description, active)
    values ('Social', 5999, 2, 'month', '2 cortes/mês', true);
  end if;

  -- Popular
  if exists (select 1 from public.plans where name = 'Popular') then
    update public.plans set price = 7999, monthly_credits = 3, interval = 'month', active = true where name = 'Popular';
  else
    insert into public.plans(name, price, monthly_credits, interval, description, active)
    values ('Popular', 7999, 3, 'month', '3 cortes/mês', true);
  end if;

  -- Premium
  if exists (select 1 from public.plans where name = 'Premium') then
    update public.plans set price = 15999, monthly_credits = 4, interval = 'month', active = true where name = 'Premium';
  else
    insert into public.plans(name, price, monthly_credits, interval, description, active)
    values ('Premium', 15999, 4, 'month', '4 cortes/mês', true);
  end if;
end
$$;

commit;

begin;
-- Helper function used by RLS policies
create or replace function public.has_role(p_user uuid, p_role text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists(select 1 from public.user_roles ur where ur.user_id = p_user and ur.role = p_role)
    or exists(select 1 from public.profiles pr where pr.id = p_user and pr.role = p_role);
$$;

grant execute on function public.has_role(uuid, text) to authenticated;

commit;
-- Create user_roles if missing
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','owner','salon_owner','user','customer')),
  created_at timestamptz default now(),
  primary key (user_id, role)
);

create index if not exists user_roles_user_idx on public.user_roles(user_id);

commit;

begin;
-- Basic RLS policies (view own roles, admins view all)
alter table public.user_roles enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Users can view their own roles'
  ) then
    create policy "Users can view their own roles" on public.user_roles for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Admins can view all roles'
  ) then
    create policy "Admins can view all roles" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

commit;

create or replace function public.count_common_users()
returns integer
language sql
security definer
set search_path = public
as $$
  with roles as (
    select ur.user_id, ur.role from public.user_roles ur
  )
  select count(distinct p.id)::int
  from public.profiles p
  left join roles r on r.user_id = p.id
  where coalesce(r.role, p.role, 'user') not in ('admin', 'owner', 'salon_owner');
$$;

grant execute on function public.count_common_users() to authenticated;

commit;

begin;

create or replace function public.user_contacts_for_users(p_ids uuid[])
returns table(user_id uuid, email text, full_name text)
language sql
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(p.email, au.email) as email,
    coalesce(p.full_name, p.name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', p.email) as full_name
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.id = any(p_ids);
$$;

grant execute on function public.user_contacts_for_users(uuid[]) to authenticated;

commit;

begin;

create or replace function public.display_names_for_users(p_ids uuid[])
returns table(user_id uuid, full_name text)
language sql
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(p.full_name, p.name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', p.email) as full_name
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.id = any(p_ids);
$$;

grant execute on function public.display_names_for_users(uuid[]) to authenticated;

commit;

begin;

create or replace function public.salon_totals_for_period(p_salon uuid, p_start timestamptz, p_end timestamptz)
returns table(amount numeric, platform_amount numeric, salon_amount numeric)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(vl.amount), 0) as amount,
    coalesce(sum(vl.platform_amount), 0) as platform_amount,
    coalesce(sum(vl.salon_amount), 0) as salon_amount
  from public.visit_logs vl
  where vl.salon_id = p_salon
    and (
      (vl.created_at between p_start and p_end)
      or (vl.visited_at between p_start and p_end)
    );
$$;

grant execute on function public.salon_totals_for_period(uuid, timestamptz, timestamptz) to authenticated;

commit;

begin;

create or replace function public.backfill_visit_logs_for_salon(p_salon uuid, p_start timestamptz, p_end timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_count int := 0; v_sub_id uuid; v_price numeric; v_credits int; v_amount numeric; v_platform numeric; v_salon numeric; rec record;
        v_user_plan uuid; v_ps timestamptz; v_pe timestamptz;
begin
  select id into v_sub_id from public.subscriptions where salon_id = p_salon and status = 'active' order by created_at desc limit 1;
  -- iterate used codes for this salon in period and insert missing visit logs
  for rec in
    select c.id as code_id, c.user_id as user_id, c.used_at as used_at
    from public.codes c
    where c.used_by_salon_id = p_salon and c.used_at between p_start and p_end and (c.status = 'used' or c.used = true)
  loop
    -- skip if already has a visit log for this code
    if exists (select 1 from public.visit_logs vl where vl.code_id = rec.code_id) then
      continue;
    end if;

    -- resolve user's active subscription at usage time
    select us.plan_id, us.current_period_start, us.current_period_end into v_user_plan, v_ps, v_pe
    from public.user_subscriptions us
    where us.user_id = rec.user_id and us.status = 'active'
    order by us.current_period_end desc limit 1;
    if v_user_plan is null then
      continue;
    end if;
    if v_ps is not null and v_pe is not null then
      if not (rec.used_at between v_ps and v_pe) then
        continue;
      end if;
    end if;

    -- compute per-visit amounts
    select price, coalesce(monthly_credits, cuts_per_month, 1) into v_price, v_credits from public.plans where id = v_user_plan;
    v_amount := round(((coalesce(v_price, 0) / 100) / greatest(v_credits, 1))::numeric, 2);
    v_platform := round((v_amount * 0.2)::numeric, 2);
    v_salon := v_amount - v_platform;

    -- insert visit log
    insert into public.visit_logs(user_id, salon_id, subscription_id, code_id, amount, salon_amount, platform_amount, created_at, visited_at)
    values (rec.user_id, p_salon, v_sub_id, rec.code_id, v_amount, v_salon, v_platform, rec.used_at, rec.used_at);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', v_count);
end;
$$;

grant execute on function public.backfill_visit_logs_for_salon(uuid, timestamptz, timestamptz) to authenticated;

commit;
