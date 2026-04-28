-- True Page Web Design client portal starter schema.
-- Run this in the Supabase SQL editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  business text not null default '',
  phone text not null default '',
  address text not null default '',
  internal_notes text not null default '',
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists internal_notes text not null default '';

create table if not exists public.client_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('local-launch', 'growth-website', 'care-plan', 'website-partner')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'none')),
  member_since date not null default current_date,
  next_billing text not null default '',
  payment_status text not null default 'Project billing',
  last_payment_update timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  type text not null default 'General request',
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High')),
  details text not null default '',
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Closed')),
  billing_notice text not null default '',
  screenshot_path text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  requested_plan text not null check (requested_plan in ('local-launch', 'growth-website', 'care-plan', 'website-partner')),
  notes text not null default '',
  status text not null default 'Requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_plans drop constraint if exists client_plans_plan_check;
alter table public.client_plans
  add constraint client_plans_plan_check
  check (plan in ('local-launch', 'growth-website', 'care-plan', 'website-partner'));

alter table public.plan_requests drop constraint if exists plan_requests_requested_plan_check;
alter table public.plan_requests
  add constraint plan_requests_requested_plan_check
  check (requested_plan in ('local-launch', 'growth-website', 'care-plan', 'website-partner'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.role <> 'client' and not public.is_admin() then
    raise exception 'Only admins can create admin profiles.';
  end if;

  if tg_op = 'UPDATE' and old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

create or replace function public.cancel_current_plan()
returns public.client_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_plan public.client_plans;
begin
  update public.client_plans
  set
    status = 'cancelled',
    next_billing = 'Not scheduled',
    payment_status = 'Cancelled'
  where id = (
    select id
    from public.client_plans
    where client_id = (select auth.uid())
    order by created_at desc
    limit 1
  )
  returning * into updated_plan;

  return updated_plan;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

drop trigger if exists client_plans_set_updated_at on public.client_plans;
create trigger client_plans_set_updated_at
before update on public.client_plans
for each row execute function public.set_updated_at();

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

drop trigger if exists plan_requests_set_updated_at on public.plan_requests;
create trigger plan_requests_set_updated_at
before update on public.plan_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.client_plans enable row level security;
alter table public.tickets enable row level security;
alter table public.plan_requests enable row level security;

grant execute on function public.cancel_current_plan() to authenticated;

drop policy if exists "Clients can view own profile" on public.profiles;
create policy "Clients can view own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Clients can create own profile" on public.profiles;
create policy "Clients can create own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Clients can update own profile" on public.profiles;
create policy "Clients can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id or public.is_admin())
with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Clients can view own plans" on public.client_plans;
create policy "Clients can view own plans"
on public.client_plans for select
to authenticated
using ((select auth.uid()) = client_id or public.is_admin());

drop policy if exists "Admins can manage plans" on public.client_plans;
create policy "Admins can manage plans"
on public.client_plans for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Clients can create own initial plan" on public.client_plans;
create policy "Clients can create own initial plan"
on public.client_plans for insert
to authenticated
with check ((select auth.uid()) = client_id);

drop policy if exists "Clients can view own tickets" on public.tickets;
create policy "Clients can view own tickets"
on public.tickets for select
to authenticated
using ((select auth.uid()) = client_id or public.is_admin());

drop policy if exists "Clients can create own tickets" on public.tickets;
create policy "Clients can create own tickets"
on public.tickets for insert
to authenticated
with check ((select auth.uid()) = client_id);

drop policy if exists "Admins can update tickets" on public.tickets;
create policy "Admins can update tickets"
on public.tickets for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Clients can view own plan requests" on public.plan_requests;
create policy "Clients can view own plan requests"
on public.plan_requests for select
to authenticated
using ((select auth.uid()) = client_id or public.is_admin());

drop policy if exists "Clients can create own plan requests" on public.plan_requests;
create policy "Clients can create own plan requests"
on public.plan_requests for insert
to authenticated
with check ((select auth.uid()) = client_id);

drop policy if exists "Admins can update plan requests" on public.plan_requests;
create policy "Admins can update plan requests"
on public.plan_requests for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-screenshots',
  'ticket-screenshots',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clients upload own ticket screenshots" on storage.objects;
create policy "Clients upload own ticket screenshots"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'ticket-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Clients view own ticket screenshots" on storage.objects;
create policy "Clients view own ticket screenshots"
on storage.objects for select
to authenticated
using (
  bucket_id = 'ticket-screenshots'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin()
  )
);

-- Manual step after your owner account exists:
-- update public.profiles
-- set role = 'admin'
-- where id = 'YOUR_OWNER_AUTH_USER_ID';
