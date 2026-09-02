-- ============================================================================
-- AnyTimeRental — initial schema, RLS, storage, availability logic
-- Idempotent-ish: safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending', 'confirmed', 'picked_up', 'returned', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfillment_type as enum ('pickup', 'delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deposit_status as enum ('none', 'held', 'released', 'captured');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Admin allowlist — emails here become 'admin' automatically on sign-up
-- ---------------------------------------------------------------------------
create table if not exists public.admin_allowlist (
  email text primary key
);
alter table public.admin_allowlist enable row level security;

-- ---------------------------------------------------------------------------
-- Users (profile mirror of auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  role user_role not null default 'customer',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users enable row level security;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    case when exists (select 1 from public.admin_allowlist a where lower(a.email) = lower(new.email))
         then 'admin'::user_role else 'customer'::user_role end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin() — used throughout RLS
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  description text not null default '',
  specs jsonb not null default '{}'::jsonb,
  dimensions text,
  weight text,
  price_day numeric(10,2) not null check (price_day >= 0),
  price_weekend numeric(10,2),
  price_week numeric(10,2),
  deposit numeric(10,2) not null default 0 check (deposit >= 0),
  quantity int not null default 1 check (quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.items enable row level security;
create index if not exists items_category_idx on public.items (category);
create index if not exists items_active_idx on public.items (active);

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Item photos
-- ---------------------------------------------------------------------------
create table if not exists public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.item_photos enable row level security;
create index if not exists item_photos_item_idx on public.item_photos (item_id, sort);

-- ---------------------------------------------------------------------------
-- Blocked dates
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
alter table public.blocked_dates enable row level security;
create index if not exists blocked_dates_item_idx on public.blocked_dates (item_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  status booking_status not null default 'pending',
  start_date date not null,
  end_date date not null,
  fulfillment fulfillment_type not null default 'pickup',
  delivery_address jsonb,
  delivery_distance_miles numeric(6,2),
  contact_name text,
  contact_email text,
  contact_phone text,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  tax_rate numeric(6,4) not null default 0,
  tax numeric(10,2) not null default 0,
  deposit_total numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'usd',
  stripe_session_id text,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  deposit_payment_intent_id text,
  deposit_status deposit_status not null default 'none',
  amount_refunded numeric(10,2) not null default 0,
  terms_accepted_at timestamptz,
  notes text,
  reminder_pickup_sent_at timestamptz,
  reminder_return_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
alter table public.bookings enable row level security;
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_dates_idx on public.bookings (start_date, end_date);
create index if not exists bookings_session_idx on public.bookings (stripe_session_id);

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Booking items
-- ---------------------------------------------------------------------------
create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  qty int not null check (qty > 0),
  unit_price_snapshot numeric(10,2) not null,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);
alter table public.booking_items enable row level security;
create index if not exists booking_items_booking_idx on public.booking_items (booking_id);
create index if not exists booking_items_item_idx on public.booking_items (item_id);

-- ---------------------------------------------------------------------------
-- Settings (single row, id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'AnyTimeRental',
  logo_url text,
  contact_email text,
  contact_phone text,
  pickup_address text not null default '',
  hours jsonb not null default '{}'::jsonb,
  delivery_radius_miles numeric(6,2) not null default 30,
  delivery_fee numeric(10,2) not null default 50,
  free_delivery_threshold numeric(10,2) not null default 300,
  min_rental_days int not null default 1,
  tax_rate numeric(6,4) not null default 0.06,
  cancellation_policy text not null default '',
  late_fee_policy text not null default '',
  terms_text text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);
alter table public.reviews enable row level security;
create index if not exists reviews_item_idx on public.reviews (item_id);

-- ---------------------------------------------------------------------------
-- Availability: available qty for an item over [p_start, p_end] (inclusive)
--   available = quantity
--             - SUM(qty of overlapping booking_items whose booking is
--                   confirmed / picked_up, or pending within the last 20 min)
--             - (item.quantity if any blocked_dates overlap)
-- ---------------------------------------------------------------------------
create or replace function public.item_available_qty(
  p_item_id uuid, p_start date, p_end date
) returns int
language sql stable security definer set search_path = public as $$
  with base as (
    select quantity from public.items where id = p_item_id
  ),
  booked as (
    select coalesce(sum(bi.qty), 0)::int as q
    from public.booking_items bi
    join public.bookings b on b.id = bi.booking_id
    where bi.item_id = p_item_id
      and b.start_date <= p_end
      and b.end_date   >= p_start
      and (
        b.status in ('confirmed', 'picked_up')
        or (b.status = 'pending' and b.created_at > now() - interval '20 minutes')
      )
  ),
  blocked as (
    select exists (
      select 1 from public.blocked_dates d
      where d.item_id = p_item_id
        and d.start_date <= p_end
        and d.end_date   >= p_start
    ) as is_blocked
  )
  select greatest(
    0,
    (select quantity from base)
    - (select q from booked)
    - case when (select is_blocked from blocked) then (select quantity from base) else 0 end
  );
$$;

grant execute on function public.item_available_qty(uuid, date, date) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================================
-- Row Level Security policies
-- ============================================================================

-- admin_allowlist: admin only
drop policy if exists admin_allowlist_admin on public.admin_allowlist;
create policy admin_allowlist_admin on public.admin_allowlist
  for all using (public.is_admin()) with check (public.is_admin());

-- users
drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- items
drop policy if exists items_public_read on public.items;
create policy items_public_read on public.items
  for select using (active or public.is_admin());

drop policy if exists items_admin_write on public.items;
create policy items_admin_write on public.items
  for all using (public.is_admin()) with check (public.is_admin());

-- item_photos
drop policy if exists item_photos_public_read on public.item_photos;
create policy item_photos_public_read on public.item_photos
  for select using (true);

drop policy if exists item_photos_admin_write on public.item_photos;
create policy item_photos_admin_write on public.item_photos
  for all using (public.is_admin()) with check (public.is_admin());

-- blocked_dates
drop policy if exists blocked_dates_public_read on public.blocked_dates;
create policy blocked_dates_public_read on public.blocked_dates
  for select using (true);

drop policy if exists blocked_dates_admin_write on public.blocked_dates;
create policy blocked_dates_admin_write on public.blocked_dates
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings: owner reads own, admin all. Writes via service role only.
drop policy if exists bookings_select_own_or_admin on public.bookings;
create policy bookings_select_own_or_admin on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- booking_items: visible if parent booking visible; writes via service/admin.
drop policy if exists booking_items_select on public.booking_items;
create policy booking_items_select on public.booking_items
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and (b.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists booking_items_admin_write on public.booking_items;
create policy booking_items_admin_write on public.booking_items
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: public read (storefront needs it), admin write
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select using (true);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- reviews: public read; user may write a review for an item they had returned
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      join public.booking_items bi on bi.booking_id = b.id
      where b.user_id = auth.uid()
        and bi.item_id = reviews.item_id
        and b.status = 'returned'
    )
  );

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- Seed the single settings row with owner inputs from CLAUDE.md
-- ============================================================================
insert into public.settings (id, business_name, pickup_address, delivery_radius_miles,
  delivery_fee, free_delivery_threshold, min_rental_days, tax_rate,
  cancellation_policy, late_fee_policy, terms_text, contact_email, contact_phone)
values (
  1,
  'AnyTimeRental',
  'Madison Trust Elementary School parking lot, Brambleton, VA 20148',
  30, 50, 300, 1, 0.06,
  'No refunds. All bookings are final once paid. In exceptional cases the owner may issue a manual refund at their discretion.',
  'Late returns are charged one full day''s rental rate per item for each day late, billed to the card on file.',
  'By booking you agree to the rental terms: all sales are final (no refunds); you are responsible for the equipment while in your possession; late returns incur one full day''s rate per item per day; the security deposit is held as a card authorization and released after the items are returned undamaged; a delivery fee applies for delivery within 30 miles of the pickup address (free over $300).',
  null,
  '847 363 0985'
)
on conflict (id) do nothing;
