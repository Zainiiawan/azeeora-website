-- Level-wise (multi-level) team commissions: an order can now book one
-- commission entry PER SPONSOR LEVEL (direct sponsor, their sponsor, etc.),
-- not just one. 0003_members.sql's unique index allowed only a single
-- commission row per order, which this replaces with "one commission row
-- per (order, sponsor)" — still prevents double-booking the same sponsor on
-- the same order, but allows several sponsors (levels) to each have one.

drop index if exists public.wallet_entries_commission_key;

create unique index if not exists wallet_entries_commission_per_sponsor_key
  on public.wallet_entries ("order", "user")
  where type = 'commission';

-- Group BV (own + entire downline's BV) and a named rank, used for the
-- level-wise team / rank-bonus system. Generated columns so admin reports
-- can filter/sort by rank without touching every route.
alter table public.users add column if not exists group_bv numeric generated always as (coalesce((data->>'groupBV')::numeric, 0)) stored;
alter table public.users add column if not exists rank text generated always as (data->>'rank') stored;
create index if not exists users_group_bv_idx on public.users (group_bv desc);

-- Fast duplicate-CNIC lookups (one ID card should only ever back one
-- partner/KYC account) used by findCnicConflict() in src/server/members.ts.
create index if not exists users_partner_cnic_idx on public.users ((data #>> '{partner,cnic}'));
create index if not exists users_kyc_cnic_idx on public.users ((data #>> '{kyc,cnic}'));
