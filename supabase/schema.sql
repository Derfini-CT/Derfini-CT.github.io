-- Derfini C T portfolio: schema, database RLS, and Storage object policies.
-- Run once in a new Supabase project's SQL Editor as the project owner.
-- This file may be rerun: table definitions are retained and named policies
-- and triggers are replaced. It does not migrate incompatible older schemas.
-- Create the project-images bucket through Dashboard / Storage API separately:
-- public = true; file size limit = 5 MiB (5242880 bytes);
-- allowed MIME types = image/jpeg, image/png, image/webp.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Membership can be provisioned only by the project owner / trusted backend.
-- A successful login does not, by itself, authorize portfolio administration.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;
drop policy if exists admin_membership_read_self on public.admin_users;
create policy admin_membership_read_self on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()));
-- No client INSERT / UPDATE / DELETE grants or policies on admin_users.

-- The owner-created definer avoids recursive RLS membership checks. Its empty
-- search_path and fully qualified references prevent search-path substitution.
create or replace function private.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;
revoke all on function private.is_portfolio_admin() from public;
grant execute on function private.is_portfolio_admin() to anon, authenticated;

-- A safe boolean-only RPC lets the app verify the current account's membership.
create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_portfolio_admin(); $$;
revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public;

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  category text not null check (category in ('programming','technical','data','tools')),
  level text check (level is null or length(btrim(level)) between 1 and 100),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists skills_display_order_idx on public.skills(category, display_order, created_at);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  short_description text not null check (length(btrim(short_description)) between 1 and 1000),
  full_description text not null default '' check (length(full_description) <= 10000),
  technologies text[] not null default '{}'::text[] check (cardinality(technologies) <= 30),
  github_url text check (github_url is null or (length(github_url) <= 2048 and github_url ~ '^https?://[^[:space:]]+$')),
  demo_url text check (demo_url is null or (length(demo_url) <= 2048 and demo_url ~ '^https?://[^[:space:]]+$')),
  -- A bucket-relative path only. Public URL is computed by the Storage SDK.
  image_path text check (image_path is null or image_path ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$'),
  status text not null default 'draft' check (status in ('unspecified','draft','in_progress','completed','archived')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_display_order_idx on public.projects(status, display_order, created_at);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  issuer text check (issuer is null or length(btrim(issuer)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  credential_url text check (credential_url is null or (length(credential_url) <= 2048 and credential_url ~ '^https?://[^[:space:]]+$')),
  issued_on date,
  score numeric(5,2) check (score is null or score between 0 and 100),
  recognition text check (recognition is null or length(btrim(recognition)) between 1 and 100),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists certifications_display_order_idx on public.certifications(display_order, created_at);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  organization text check (organization is null or length(btrim(organization)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  technologies text[] not null default '{}'::text[] check (cardinality(technologies) <= 30),
  started_on date,
  ended_on date,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);
create index if not exists experiences_display_order_idx on public.experiences(display_order, created_at);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  event_name text check (event_name is null or length(btrim(event_name)) between 1 and 200),
  recognition text check (recognition is null or length(btrim(recognition)) between 1 and 100),
  achieved_on date,
  evidence_url text check (evidence_url is null or (length(evidence_url) <= 2048 and evidence_url ~ '^https?://[^[:space:]]+$')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists achievements_display_order_idx on public.achievements(display_order, created_at);

-- Exact grants and separate policies per operation. All authenticated accounts
-- have table write grants, but RLS admits writes only for admin_users members.
-- In particular, newly registered accounts cannot grant themselves admin access.
do $$
declare table_name text;
begin
  foreach table_name in array array['skills','projects','certifications','experiences','achievements'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select on table public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on table public.%I to authenticated', table_name);
    execute format('drop trigger if exists portfolio_set_updated_at on public.%I', table_name);
    execute format('create trigger portfolio_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
    execute format('drop policy if exists portfolio_public_read on public.%I', table_name);
    execute format('drop policy if exists portfolio_admin_read on public.%I', table_name);
    execute format('drop policy if exists portfolio_admin_insert on public.%I', table_name);
    execute format('drop policy if exists portfolio_admin_update on public.%I', table_name);
    execute format('drop policy if exists portfolio_admin_delete on public.%I', table_name);
    if table_name = 'projects' then
      execute format('create policy portfolio_public_read on public.%I for select to anon, authenticated using (status in (''unspecified'',''in_progress'',''completed''))', table_name);
      execute format('create policy portfolio_admin_read on public.%I for select to authenticated using ((select private.is_portfolio_admin()))', table_name);
    else
      execute format('create policy portfolio_public_read on public.%I for select to anon, authenticated using (true)', table_name);
    end if;
    execute format('create policy portfolio_admin_insert on public.%I for insert to authenticated with check ((select private.is_portfolio_admin()))', table_name);
    execute format('create policy portfolio_admin_update on public.%I for update to authenticated using ((select private.is_portfolio_admin())) with check ((select private.is_portfolio_admin()))', table_name);
    execute format('create policy portfolio_admin_delete on public.%I for delete to authenticated using ((select private.is_portfolio_admin()))', table_name);
  end loop;
end;
$$;

-- Supabase already manages storage.objects RLS and grants. Do not disable RLS
-- or directly create/delete Storage metadata rows. Use the Storage API.
-- Public bucket URLs are directly readable; no public bucket-listing policy
-- is necessary. Admin SELECT permits dashboard list/delete/update operations.
drop policy if exists portfolio_images_admin_select on storage.objects;
create policy portfolio_images_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'project-images' and (select private.is_portfolio_admin()));

drop policy if exists portfolio_images_admin_insert on storage.objects;
create policy portfolio_images_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and (select private.is_portfolio_admin())
    and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$'
  );

drop policy if exists portfolio_images_admin_update on storage.objects;
create policy portfolio_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and (select private.is_portfolio_admin()))
  with check (
    bucket_id = 'project-images'
    and (select private.is_portfolio_admin())
    and name ~ '^projects/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$'
  );

drop policy if exists portfolio_images_admin_delete on storage.objects;
create policy portfolio_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and (select private.is_portfolio_admin()));

commit;
