-- Editable page text (hero, about, education, headings, contact, footer).
-- Run once after schema.sql in the Supabase SQL Editor as the project owner.
-- Safe to rerun: the table and saved text are kept, policies are replaced.
-- The row starts empty ({}); the site shows its built-in text until you save.
begin;

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
create policy site_content_public_read on public.site_content
  for select to anon, authenticated using (true);
create policy site_content_admin_insert on public.site_content
  for insert to authenticated with check ((select private.is_portfolio_admin()));
create policy site_content_admin_update on public.site_content
  for update to authenticated
  using ((select private.is_portfolio_admin()))
  with check ((select private.is_portfolio_admin()));
-- No delete: the page text is one permanent row.

insert into public.site_content (id) values (1) on conflict (id) do nothing;

commit;
