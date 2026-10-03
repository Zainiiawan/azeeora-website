-- Brand Partners (referral), wholesale accounts, wallet, withdrawals, and the
-- supporting content tables (campaigns, incentives, training, pickup points,
-- stock movements). Same document shape as 0001.

-- Member code (AZ-123456) is unique; referral lookups go by sponsor.
alter table public.users add column if not exists member_code text generated always as (data->>'memberCode') stored;
alter table public.users add column if not exists referred_by text generated always as (data->>'referredBy') stored;
create unique index if not exists users_member_code_key on public.users (member_code) where member_code is not null;
create index if not exists users_referred_by_idx on public.users (referred_by);

-- Wallet ledger: every money movement is one row. Balance = sum(amount) of
-- rows with status 'available'. Commissions start 'pending'.
create table if not exists public.wallet_entries (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "user" text generated always as (data->>'user') stored,
  status text generated always as (data->>'status') stored,
  type text generated always as (data->>'type') stored,
  "order" text generated always as (data->>'order') stored
);
create index if not exists wallet_entries_user_idx on public.wallet_entries ("user", status);
create index if not exists wallet_entries_order_idx on public.wallet_entries ("order");
-- one commission per order
create unique index if not exists wallet_entries_commission_key on public.wallet_entries ("order") where type = 'commission';

create table if not exists public.withdrawals (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "user" text generated always as (data->>'user') stored,
  status text generated always as (data->>'status') stored
);
create index if not exists withdrawals_user_idx on public.withdrawals ("user");

create table if not exists public.campaigns (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text generated always as (data->>'slug') stored
);
create unique index if not exists campaigns_slug_key on public.campaigns (slug);

create table if not exists public.incentives (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainings (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_points (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product text generated always as (data->>'product') stored
);
create index if not exists stock_movements_product_idx on public.stock_movements (product);

alter table public.wallet_entries enable row level security;
alter table public.withdrawals enable row level security;
alter table public.campaigns enable row level security;
alter table public.incentives enable row level security;
alter table public.trainings enable row level security;
alter table public.pickup_points enable row level security;
alter table public.stock_movements enable row level security;

-- The app login gets the same access as on the other store tables.
do $$
declare t text;
begin
  if exists (select 1 from pg_roles where rolname = 'azeeora_app') then
    foreach t in array array['wallet_entries','withdrawals','campaigns','incentives','trainings','pickup_points','stock_movements']
    loop
      execute format('grant select, insert, update, delete on public.%I to azeeora_app', t);
      if not exists (select 1 from pg_policies where tablename = t and policyname = 'azeeora_app_all') then
        execute format('create policy azeeora_app_all on public.%I for all to azeeora_app using (true) with check (true)', t);
      end if;
    end loop;
  end if;
end $$;
