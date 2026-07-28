-- Metric West billing portal (separate from Case-Flo)
-- Agencies, invites, subscriptions — no PHI

create extension if not exists pgcrypto;

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text not null,
  contact_name text,
  stripe_customer_id text unique,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'agency'
    check (role in ('admin', 'agency')),
  agency_id uuid references public.agencies (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agency_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  product_key text not null default 'caseflo_starter',
  product_label text not null default 'Case-Flo Pro — Starter (1–10 users)',
  stripe_price_id text not null,
  stripe_subscription_id text unique,
  status text not null default 'incomplete'
    check (status in ('incomplete', 'active', 'past_due', 'canceled', 'unpaid', 'trialing')),
  monthly_amount_cents integer not null default 75000,
  seat_band text not null default '1-10',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index agency_subscriptions_one_active_per_agency
  on public.agency_subscriptions (agency_id)
  where status in ('incomplete', 'active', 'past_due', 'trialing', 'unpaid');

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  role text not null default 'agency' check (role in ('agency')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invites_token_idx on public.invites (token);
create index profiles_agency_id_idx on public.profiles (agency_id);

alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.agency_subscriptions enable row level security;
alter table public.invites enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.my_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.profiles where id = auth.uid();
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

create policy "agencies_admin_all"
  on public.agencies for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "agencies_member_select"
  on public.agencies for select
  using (id = public.my_agency_id());

create policy "subscriptions_admin_all"
  on public.agency_subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "subscriptions_member_select"
  on public.agency_subscriptions for select
  using (agency_id = public.my_agency_id());

create policy "invites_admin_all"
  on public.invites for all
  using (public.is_admin())
  with check (public.is_admin());

-- Auto-create profile on signup; promote ADMIN_EMAIL via trigger metadata is handled in app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_app_meta_data->>'role', 'agency')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
