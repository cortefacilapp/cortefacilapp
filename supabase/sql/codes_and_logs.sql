create extension if not exists pgcrypto;

create table if not exists public.codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'generated' check (status in ('generated','used','expired','cancelled')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_salon_id uuid references public.salons(id),
  created_at timestamptz default now()
);

create index if not exists codes_user_idx on public.codes(user_id);
create index if not exists codes_status_idx on public.codes(status);
create index if not exists codes_expires_idx on public.codes(expires_at);

create table if not exists public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.codes(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists visit_logs_salon_idx on public.visit_logs(salon_id);
create index if not exists visit_logs_user_idx on public.visit_logs(user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.user_credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  credits integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.codes enable row level security;
alter table public.visit_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_credits enable row level security;

drop policy if exists codes_select_owner on public.codes;
create policy codes_select_owner on public.codes for select to authenticated using (user_id = auth.uid());

drop policy if exists visit_logs_select_owner on public.visit_logs;
create policy visit_logs_select_owner on public.visit_logs for select to authenticated using (user_id = auth.uid());

drop policy if exists user_credits_select_self on public.user_credits;
create policy user_credits_select_self on public.user_credits for select to authenticated using (user_id = auth.uid());

