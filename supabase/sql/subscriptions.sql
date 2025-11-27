create extension if not exists pgcrypto;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null,
  interval text not null check (interval in ('month','year')),
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('pending','active','past_due','canceled')) default 'pending',
  started_at timestamptz,
  current_period_end timestamptz,
  mp_preference_id text,
  mp_payment_id text,
  external_reference text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_salon_idx on public.subscriptions(salon_id);
create index if not exists subscriptions_plan_idx on public.subscriptions(plan_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

alter table public.salons add column if not exists approved_by uuid references public.profiles(id);
alter table public.salons add column if not exists rejected_at timestamptz;
alter table public.salons add column if not exists rejected_by uuid references public.profiles(id);
alter table public.salons add column if not exists rejection_reason text;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'salons_status_chk') then
    alter table public.salons drop constraint salons_status_chk;
  end if;
  alter table public.salons add constraint salons_status_chk check (status in ('pending','approved','inactive','rejected'));
end $$;

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists plans_select_all on public.plans;
create policy plans_select_all on public.plans for select to authenticated using (active = true);

drop policy if exists subscriptions_select_owner on public.subscriptions;
create policy subscriptions_select_owner on public.subscriptions for select to authenticated using (
  exists (
    select 1 from public.salons s where s.id = subscriptions.salon_id and s.owner_id = auth.uid()
  )
);

drop policy if exists subscriptions_update_admin on public.subscriptions;
create policy subscriptions_update_admin on public.subscriptions for update to authenticated using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
)
with check (
  exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
);

