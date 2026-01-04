-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  role text check (role in ('admin', 'salon_owner', 'subscriber')) default 'subscriber',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create plans table
create table if not exists public.plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  price decimal(10,2) not null,
  credits_per_month integer not null,
  description text,
  duration_days integer default 30,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create salons table
create table if not exists public.salons (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id),
  name text not null,
  address text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create subscriptions table
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  plan_id uuid references public.plans(id) not null,
  salon_id uuid references public.salons(id), -- Nullable initially
  status text check (status in ('active', 'cancelled', 'expired')) default 'active',
  current_credits integer not null default 0,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create payments table
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  subscription_id uuid references public.subscriptions(id),
  plan_id uuid references public.plans(id),
  amount decimal(10,2) not null,
  status text not null, -- pending, approved, rejected
  payment_method text,
  transaction_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create haircut_codes table
create table if not exists public.haircut_codes (
  id uuid default uuid_generate_v4() primary key,
  subscription_id uuid references public.subscriptions(id) not null,
  code text not null,
  expires_at timestamp with time zone not null,
  is_used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create haircut_history table
create table if not exists public.haircut_history (
  id uuid default uuid_generate_v4() primary key,
  subscription_id uuid references public.subscriptions(id) not null,
  salon_id uuid references public.salons(id),
  code_used text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.salons enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.haircut_codes enable row level security;
alter table public.haircut_history enable row level security;

-- Policies (Simplified for development)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Plans are viewable by everyone" on public.plans;
create policy "Plans are viewable by everyone" on public.plans for select using (true);

drop policy if exists "Salons are viewable by everyone" on public.salons;
create policy "Salons are viewable by everyone" on public.salons for select using (true);

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
create policy "Users can insert own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments" on public.payments for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own payments" on public.payments;
create policy "Users can insert own payments" on public.payments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own codes" on public.haircut_codes;
create policy "Users can view own codes" on public.haircut_codes for select using (
  exists (select 1 from public.subscriptions s where s.id = haircut_codes.subscription_id and s.user_id = auth.uid())
);

drop policy if exists "Users can insert own codes" on public.haircut_codes;
create policy "Users can insert own codes" on public.haircut_codes for insert with check (
  exists (select 1 from public.subscriptions s where s.id = haircut_codes.subscription_id and s.user_id = auth.uid())
);

drop policy if exists "Users can view own history" on public.haircut_history;
create policy "Users can view own history" on public.haircut_history for select using (
  exists (select 1 from public.subscriptions s where s.id = haircut_history.subscription_id and s.user_id = auth.uid())
);

-- Seed Plans (Optional - run only if needed)
insert into public.plans (name, price, credits_per_month, description)
select 'Básico', 59.90, 2, '2 cortes por mês'
where not exists (select 1 from public.plans where name = 'Básico');

insert into public.plans (name, price, credits_per_month, description)
select 'Pro', 89.90, 4, '4 cortes por mês'
where not exists (select 1 from public.plans where name = 'Pro');

insert into public.plans (name, price, credits_per_month, description)
select 'VIP', 129.90, 999, 'Cortes ilimitados'
where not exists (select 1 from public.plans where name = 'VIP');
