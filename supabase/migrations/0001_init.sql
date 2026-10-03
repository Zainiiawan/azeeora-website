-- AZEEORA COSMETICS: document-style schema on Postgres (Supabase).
--
-- Every collection from the old MongoDB database becomes one table.
-- `_id` keeps the original 24-char ObjectId so every link, order URL and
-- reference survives the migration untouched. The full document lives in
-- `data` (jsonb) and generated columns expose the fields we filter, sort or
-- enforce uniqueness on.
--
-- RLS is enabled with no policies: the public anon/publishable key cannot
-- read or write anything. The Next.js server talks to Postgres directly.

-- users ---------------------------------------------------------------------
create table if not exists users (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text generated always as (lower(data->>'email')) stored,
  role text generated always as (data->>'role') stored,
  first_name text generated always as (data->>'firstName') stored,
  last_name text generated always as (data->>'lastName') stored
);
create unique index if not exists users_email_key on users (email);
create index if not exists users_role_idx on users (role);
create index if not exists users_created_idx on users (created_at desc);

-- categories / subcategories / brands --------------------------------------
create table if not exists categories (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  slug text generated always as (data->>'slug') stored
);
create unique index if not exists categories_slug_key on categories (slug);

create table if not exists subcategories (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  slug text generated always as (data->>'slug') stored,
  category_id text generated always as (data->>'category') stored
);
create unique index if not exists subcategories_slug_key on subcategories (slug);
create index if not exists subcategories_category_idx on subcategories (category_id);

create table if not exists brands (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  slug text generated always as (data->>'slug') stored
);
create unique index if not exists brands_slug_key on brands (slug);

-- products ------------------------------------------------------------------
create table if not exists products (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text generated always as (data->>'name') stored,
  slug text generated always as (data->>'slug') stored,
  sku text generated always as (upper(data->>'sku')) stored,
  category_id text generated always as (data->>'category') stored,
  base_price numeric generated always as ((data->>'basePrice')::numeric) stored,
  is_active boolean generated always as (coalesce((data->>'isActive')::boolean, true)) stored
);
create unique index if not exists products_slug_key on products (slug);
create unique index if not exists products_sku_key on products (sku);
create index if not exists products_category_idx on products (category_id, is_active);
create index if not exists products_created_idx on products (created_at desc);

-- carts ---------------------------------------------------------------------
create table if not exists carts (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text generated always as (data->>'user') stored
);
create unique index if not exists carts_user_key on carts (user_id);

-- orders --------------------------------------------------------------------
create table if not exists orders (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_number text generated always as (data->>'orderNumber') stored,
  user_id text generated always as (data->>'user') stored,
  customer_email text generated always as (lower(data->>'customerEmail')) stored,
  status text generated always as (data->>'status') stored,
  payment_status text generated always as (data->>'paymentStatus') stored,
  payment_method text generated always as (data->>'paymentMethod') stored,
  total numeric generated always as ((data->>'total')::numeric) stored
);
create unique index if not exists orders_number_key on orders (order_number);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_payment_idx on orders (payment_status, payment_method);
create index if not exists orders_created_idx on orders (created_at desc);

-- reviews -------------------------------------------------------------------
create table if not exists reviews (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id text generated always as (data->>'product') stored,
  user_id text generated always as (data->>'user') stored,
  guest_email text generated always as (lower(data->>'guestEmail')) stored,
  rating int generated always as ((data->>'rating')::int) stored,
  is_approved boolean generated always as (coalesce((data->>'isApproved')::boolean, false)) stored
);
create index if not exists reviews_product_idx on reviews (product_id, is_approved);
create index if not exists reviews_created_idx on reviews (created_at desc);
-- one review per customer per product (matches the old API rule)
create unique index if not exists reviews_product_user_key on reviews (product_id, user_id) where user_id is not null;
create unique index if not exists reviews_product_guest_key on reviews (product_id, guest_email) where user_id is null and guest_email is not null;

-- coupons -------------------------------------------------------------------
create table if not exists coupons (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text generated always as (upper(data->>'code')) stored
);
create unique index if not exists coupons_code_key on coupons (code);

-- notifications -------------------------------------------------------------
create table if not exists notifications (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text generated always as (data->>'user') stored,
  is_read boolean generated always as (coalesce((data->>'isRead')::boolean, false)) stored
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- settings / shipping rates -------------------------------------------------
create table if not exists settings (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shipping_rates (
  _id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  city text generated always as (data->>'city') stored
);
create unique index if not exists shipping_rates_city_key on shipping_rates (lower(city));

-- RLS: no policies, so the anon/publishable key can read nothing ----------
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.shipping_rates enable row level security;
