-- OPTIONAL: run after schema + seed as project owner in SQL Editor.
-- Exercises actual PostgreSQL policies in the target Supabase project.
-- All fixture users/content changes roll back. No user passwords are created.
-- This verifies DATABASE authorization. Real Auth/Storage API flows should
-- also be checked after environment setup; Storage metadata is not modified.
-- If any statement raises an error, execute ROLLBACK before another query.

begin;

insert into auth.users (id,email) values
  ('aaaaaaaa-0000-4000-8000-000000000001','portfolio-rls-admin@example.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002','portfolio-rls-member@example.invalid');
insert into public.admin_users (user_id)
values ('aaaaaaaa-0000-4000-8000-000000000001');
insert into public.skills (id,name,category)
values ('aaaaaaaa-0000-4000-8000-000000000003','RLS fixture','technical');
insert into public.projects (id,title,short_description,status) values
  ('aaaaaaaa-0000-4000-8000-000000000004','RLS public','Fixture','unspecified'),
  ('aaaaaaaa-0000-4000-8000-000000000005','RLS draft','Fixture','draft');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
begin
  if public.is_portfolio_admin() then raise exception 'FAIL: anon is admin'; end if;
  if (select count(*) from public.skills where id='aaaaaaaa-0000-4000-8000-000000000003') <> 1 then
    raise exception 'FAIL: public cannot read skill';
  end if;
  if (select count(*) from public.projects where id in ('aaaaaaaa-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000005')) <> 1 then
    raise exception 'FAIL: draft visibility';
  end if;
  begin
    insert into public.skills (name,category) values ('Unauthorized','technical');
    raise exception 'FAIL: anon insert unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  begin
    update public.skills set display_order=500 where id='aaaaaaaa-0000-4000-8000-000000000003';
    raise exception 'FAIL: anon update unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.skills where id='aaaaaaaa-0000-4000-8000-000000000003';
    raise exception 'FAIL: anon delete unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: anon public reads and no writes';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$
declare affected integer;
begin
  if public.is_portfolio_admin() then raise exception 'FAIL: non-member is admin'; end if;
  begin
    insert into public.admin_users(user_id) values ('aaaaaaaa-0000-4000-8000-000000000002');
    raise exception 'FAIL: self-enrollment unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.skills(name,category) values ('Unauthorized','technical');
    raise exception 'FAIL: non-admin insert unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  update public.skills set display_order=500 where id='aaaaaaaa-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: non-admin update'; end if;
  delete from public.skills where id='aaaaaaaa-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: non-admin delete'; end if;
  if exists (select 1 from public.projects where id='aaaaaaaa-0000-4000-8000-000000000005') then
    raise exception 'FAIL: non-admin reads draft';
  end if;
  raise notice 'PASS: authenticated non-member cannot mutate or self-enroll';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare inserted_id uuid; affected integer;
begin
  if not public.is_portfolio_admin() then raise exception 'FAIL: admin membership'; end if;
  if not exists (select 1 from public.projects where id='aaaaaaaa-0000-4000-8000-000000000005') then
    raise exception 'FAIL: admin cannot read draft';
  end if;
  insert into public.skills(name,category) values ('Admin RLS test','technical') returning id into inserted_id;
  update public.skills set display_order=50 where id=inserted_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: admin update'; end if;
  delete from public.skills where id=inserted_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: admin delete'; end if;
  begin
    insert into public.admin_users(user_id) values ('aaaaaaaa-0000-4000-8000-000000000002');
    raise exception 'FAIL: frontend may grant admin membership';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: allowlisted admin CRUD, drafts, and locked membership';
end $$;

reset role;
delete from public.admin_users where user_id='aaaaaaaa-0000-4000-8000-000000000001';
set local role authenticated;
do $$
begin
  if public.is_portfolio_admin() then raise exception 'FAIL: membership revocation'; end if;
  begin
    insert into public.skills(name,category) values ('Revoked admin','technical');
    raise exception 'FAIL: revoked admin may write';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS: revoking admin membership immediately blocks writes';
end $$;
reset role;

rollback;
