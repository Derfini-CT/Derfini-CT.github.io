-- Create your user first in Supabase Dashboard > Authentication > Users.
-- Set your own email/password there; no password belongs in this SQL or source.
-- Copy that user's UUID, replace the placeholder below, and run in SQL Editor
-- as the project owner. The FK rejects UUIDs that do not exist in auth.users.
-- Existing / non-member Auth users cannot execute this INSERT through the app.

insert into public.admin_users (user_id)
values ('REPLACE_WITH_YOUR_AUTH_USER_UUID'::uuid)
on conflict (user_id) do nothing;

-- To revoke admin access later, run this as project owner (uncomment + replace):
-- delete from public.admin_users where user_id = 'YOUR_AUTH_USER_UUID'::uuid;
