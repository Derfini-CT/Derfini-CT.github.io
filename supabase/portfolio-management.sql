-- Editable skill groups and optional profile photos.
-- Run as the project owner after schema.sql. Safe to rerun: all portfolio
-- records, site text, existing category edits, and uploaded files are retained.
begin;

-- Include the singleton page document for projects created before site-content.sql.
create table if not exists public.site_content (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
revoke all on table public.site_content from anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant insert, update on table public.site_content to authenticated;
drop trigger if exists portfolio_set_updated_at on public.site_content;
create trigger portfolio_set_updated_at before update on public.site_content
  for each row execute function private.set_updated_at();
drop policy if exists site_content_public_read on public.site_content;
drop policy if exists site_content_admin_insert on public.site_content;
drop policy if exists site_content_admin_update on public.site_content;
create policy site_content_public_read on public.site_content for select to anon, authenticated using (true);
create policy site_content_admin_insert on public.site_content for insert to authenticated with check ((select private.is_portfolio_admin()));
create policy site_content_admin_update on public.site_content for update to authenticated using ((select private.is_portfolio_admin())) with check ((select private.is_portfolio_admin()));
insert into public.site_content (id) values (1) on conflict (id) do nothing;

create table if not exists public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (length(key) between 1 and 60 and key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 400),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists skill_categories_display_order_idx on public.skill_categories(display_order, created_at, id);

-- Seed once from the owner's currently saved group headings/descriptions. Future
-- category edits remain authoritative; rerunning this file never resets them.
with defaults(key, title, description, display_order) as (
  values
    ('programming', 'Programming', 'Languages and core programming concepts.', 0),
    ('technical', 'Embedded & technical', 'Practical experience through embedded systems work.', 1),
    ('data', 'Data & visualization', 'Analysis and dashboards for meaningful reporting.', 2),
    ('tools', 'Software & tools', 'Tools used for development, analysis, and productivity.', 3)
), saved as (select data from public.site_content where id = 1)
insert into public.skill_categories(key, title, description, display_order)
select defaults.key,
  left(coalesce(nullif(btrim(saved.data #>> array['skillGroups', defaults.key, 'title']), ''), defaults.title), 100),
  left(coalesce(saved.data #>> array['skillGroups', defaults.key, 'description'], defaults.description), 400),
  defaults.display_order
from defaults cross join saved
on conflict (key) do nothing;

-- Keep any existing skill group from an earlier custom deployment as well.
insert into public.skill_categories(key, title, description, display_order)
select distinct skills.category, left(initcap(replace(skills.category, '-', ' ')), 100), '', 4
from public.skills skills
where not exists (select 1 from public.skill_categories categories where categories.key = skills.category)
on conflict (key) do nothing;

-- schema.sql created this named check for the four original groups. The FK
-- replaces that fixed list without changing any skill or its category value.
alter table public.skills drop constraint if exists skills_category_check;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.skills'::regclass and conname = 'skills_category_fkey') then
    alter table public.skills add constraint skills_category_fkey
      foreign key (category) references public.skill_categories(key)
      on update cascade on delete restrict;
  end if;
end;
$$;

alter table public.skill_categories enable row level security;
revoke all on table public.skill_categories from anon, authenticated;
grant select on table public.skill_categories to anon, authenticated;
grant insert, update, delete on table public.skill_categories to authenticated;
drop trigger if exists portfolio_set_updated_at on public.skill_categories;
create trigger portfolio_set_updated_at before update on public.skill_categories
  for each row execute function private.set_updated_at();
drop policy if exists portfolio_public_read on public.skill_categories;
drop policy if exists portfolio_admin_insert on public.skill_categories;
drop policy if exists portfolio_admin_update on public.skill_categories;
drop policy if exists portfolio_admin_delete on public.skill_categories;
create policy portfolio_public_read on public.skill_categories for select to anon, authenticated using (true);
create policy portfolio_admin_insert on public.skill_categories for insert to authenticated with check ((select private.is_portfolio_admin()));
create policy portfolio_admin_update on public.skill_categories for update to authenticated using ((select private.is_portfolio_admin())) with check ((select private.is_portfolio_admin()));
create policy portfolio_admin_delete on public.skill_categories for delete to authenticated using ((select private.is_portfolio_admin()));

-- Reuse the existing public project-images bucket and its 5 MiB JPEG/PNG/WebP
-- limits. Only allowlisted admins may manage project or profile image paths.
-- No bucket metadata, object metadata, passwords, or privileged keys are needed.
drop policy if exists portfolio_images_admin_select on storage.objects;
create policy portfolio_images_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'project-images' and (select private.is_portfolio_admin()) and name ~ '^(projects|profile)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$');
drop policy if exists portfolio_images_admin_insert on storage.objects;
create policy portfolio_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-images' and (select private.is_portfolio_admin()) and name ~ '^(projects|profile)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$');
drop policy if exists portfolio_images_admin_update on storage.objects;
create policy portfolio_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'project-images' and (select private.is_portfolio_admin()) and name ~ '^(projects|profile)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$')
  with check (bucket_id = 'project-images' and (select private.is_portfolio_admin()) and name ~ '^(projects|profile)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$');
drop policy if exists portfolio_images_admin_delete on storage.objects;
create policy portfolio_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-images' and (select private.is_portfolio_admin()) and name ~ '^(projects|profile)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|jpeg|webp)$');

select pg_notify('pgrst', 'reload schema');
commit;
