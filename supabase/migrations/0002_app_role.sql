-- Login used by the website (DATABASE_URL). It can read and write the store
-- tables and nothing else; RLS stays on for everyone else.
-- The password is set at deploy time:  alter role azeeora_app login password '…';
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'azeeora_app') then
    create role azeeora_app nologin;
  end if;
end $$;
grant usage on schema public to azeeora_app;
grant select, insert, update, delete on public.users, public.categories, public.subcategories, public.brands,
  public.products, public.carts, public.orders, public.reviews, public.coupons, public.notifications,
  public.settings, public.shipping_rates to azeeora_app;
do $$
declare t text;
begin
  foreach t in array array['users','categories','subcategories','brands','products','carts','orders','reviews','coupons','notifications','settings','shipping_rates']
  loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'azeeora_app_all') then
      execute format('create policy azeeora_app_all on public.%I for all to azeeora_app using (true) with check (true)', t);
    end if;
  end loop;
end $$;
