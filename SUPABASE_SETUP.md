# Derfini portfolio — Supabase setup

The public portfolio remains at `/`. Admin login is at `/admin/`, with the browser-protected dashboard at `/admin/dashboard/`. Skills, Projects, Certifications, Experience, and Achievements all have add/edit/delete editors. **Categories** manages skill groups, and **Site content** edits the name, About, education/marks, profile links, optional portrait, hero, headings, highlights, soft skills, footer, and public navigation/button/contact-form wording. Supabase supplies the content while the portfolio keeps its current typeface, palette, and card design.

Reuse the configured hosted project, public `project-images` bucket, production Auth URLs, and the two public environment values in ignored `.env.local` and GitHub Actions repository Variables. Apply the category/photo migration described below when upgrading an existing project. [VERIFICATION.md](VERIFICATION.md) records completed checks and any remaining live verification; source checks alone do not prove successful authentication or hosted uploads. These steps also document setup for another project. The previous site source is preserved on `backup-before-nextjs-pages-2026-10-06` at `f746afc`.

## 1. Create your Supabase project

1. Open the [Supabase Dashboard](https://supabase.com/dashboard), select an organization, and create a project.
2. Choose a project name, a database password, and your preferred region. Keep the database password in your password manager; this website does not require it in its environment variables.
3. Wait for the project to finish provisioning.
4. Open the project's Connect dialog or API settings and copy its Project URL and public API key. The app keeps your requested variable name `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be the project's legacy `anon` key or its current publishable key. Use the key from the same project as the URL.

Project creation is covered by [Supabase's Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs). A publishable/anon key is intended for client use with RLS. Never put a `service_role` key, `sb_secret_...` key, database password, or admin password in a `NEXT_PUBLIC_` variable or committed source. [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys)

## 2. Create the database and its security policies

In Supabase, open **SQL Editor → New query**. Execute the files in this order, using their complete contents:

1. `supabase/schema.sql`
2. `supabase/seed.sql` — only for a fresh portfolio before editing live content.
3. `supabase/portfolio-management.sql`

The base schema creates `skills`, `projects`, `certifications`, `experiences`, and `achievements`, with UUID IDs, creation/update timestamps, and display order. It also creates `public.admin_users`, which links approved administrators to `auth.users` by `user_id`, and the `is_portfolio_admin` membership function.

`portfolio-management.sql` includes the earlier `site-content.sql` setup: `site_content` is one permanent JSON row for the page text, photo reference, and display settings. It starts empty and uses the built-in text until the first save. The migration also creates `skill_categories`, copies saved legacy group names/descriptions, replaces the fixed four-category check with a foreign key, and permits admin profile-photo uploads in the existing bucket. The foreign key prevents deleting a category that still contains skills. Its tables include timestamps, and category rows include display order.

**Existing projects:** if `schema.sql` and the seed were already applied, run only `portfolio-management.sql`. If `site-content.sql` was already applied too, the new migration preserves its saved content. There is no need to run `site-content.sql` separately before the new migration, and rerunning the new migration preserves category edits and uploaded files. Do not rerun `seed.sql` over portfolio content you have edited.

`schema.sql` and `portfolio-management.sql` contain the required grants, RLS policies, timestamp triggers, and Storage policies. Do not replace them with policies that grant writes to every authenticated user. The initial seed includes **VLSI**; the migration preserves its assigned technical category.

The intended access rules are:

| Caller | Portfolio reads | Content writes | Admin membership |
| --- | --- | --- | --- |
| Signed-out visitor | Public content only | Denied | Cannot view or alter the allowlist |
| Signed-in user without an admin entry | Public content only | Denied | Cannot grant themselves admin access |
| Signed-in, allowlisted administrator | Admin content, including private project statuses | Add, edit, delete | Can check their own membership |
| Project owner using SQL Editor | Administrative database access | Administrative database access | Can manage the allowlist |

The permanent `site_content` row supports admin insert/update, with no client delete permission. Categories support admin CRUD, subject to the foreign key protecting assigned skills. Public visitors can read both tables.

Project statuses `unspecified`, `in_progress`, and `completed` are visible publicly. `draft` and `archived` records remain private to administrators. Their images are stored in a public bucket and remain readable by URL. The initial supplied project uses `unspecified`; its completion status was not invented. Skill levels can be stored in the dashboard; the existing public design does not show levels.

RLS evaluates authorization inside Supabase, so hiding dashboard controls is not the only protection. Both table privileges and row policies must be applied. The schema ties write permission to the admin allowlist rather than granting it to everyone with an account. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 3. Create your administrator account

1. In Supabase, open **Authentication → Users → Add user** and choose the account creation option.
2. Enter the email address and strong password you want to use for portfolio administration. Confirm the email for this account using the dashboard's confirmation option, if available. Do not add the password to the application source or SQL files.
3. Open the created user and copy its **User UID**, the UUID identifying this account.
4. Open `supabase/create-admin.sql`, replace its UID placeholder with that UUID, and run the completed SQL in Supabase SQL Editor. It inserts the user into `public.admin_users`.
5. Open **Authentication → Sign In / Providers** or the equivalent general Auth settings and turn off **Allow new users to sign up**. Keep the email/password provider enabled. Anonymous Auth sign-ins are unnecessary for public portfolio visitors; keep them disabled.

The important SQL statement is:

```sql
-- Replace this placeholder with the UID copied from Authentication → Users.
insert into public.admin_users (user_id)
values ('YOUR-AUTH-USER-UUID'::uuid)
on conflict (user_id) do nothing;
```

The placeholder is intentionally not an account credential. Authentication alone does not grant admin rights: the matching UID must exist in `admin_users`. To revoke an administrator, delete that UID's allowlist row in SQL Editor; their Auth account can remain without write access.

[Supabase user management](https://supabase.com/docs/guides/auth/users) documents dashboard administration and user IDs. [Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration) explains the signup switch. If the dashboard offers an invitation instead of direct account creation, use an account with a confirmed email and a password before using this site's password login. Invitation acceptance and password recovery screens are not part of this portfolio implementation.

## 4. Create the project and profile image bucket

In Supabase **Storage**, create a bucket with these exact settings:

| Setting | Value |
| --- | --- |
| Bucket name / ID | `project-images` |
| Public bucket | Enabled |
| Maximum file size | 5 MiB (5,242,880 bytes; the dashboard may label this 5 MB) |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |

The public bucket lets visitors load portfolio images. The policies restrict uploads, edits, and deletion to allowlisted administrators and raster image paths under `projects/` or `profile/`. The base schema supplies project-upload policies; the new migration extends them to profile images. Upload through the Projects editor or **Site content → Profile** rather than inserting/deleting rows directly in Supabase's `storage` schema. [Create buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [public bucket behavior](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access policies](https://supabase.com/docs/guides/storage/security/access-control), [Storage schema rules](https://supabase.com/docs/guides/storage/schema/design)

Profile photos are optional: no portrait is supplied or invented. Choose a clear JPEG, PNG, or WebP file up to 5 MiB, optionally describe it for screen readers, enable **Show profile photo in About**, and save site content. The switch hides the photo while keeping its selection. **Remove displayed photo** asks for confirmation, then clears its saved reference when you save. Replacing/removing a profile photo retains previous files in the public bucket, so previous URLs remain readable. An upload is also retained if a save cannot be confirmed; a timed-out save may still have committed. Review retained files in Supabase Storage before any manual cleanup.

## 5. Configure environment variables

From the project root, copy `.env.example` to `.env.local` and replace its placeholders:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PROJECT-PUBLISHABLE-OR-ANON-KEY
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Keep `.env.local` out of Git. The public URL and public API key are expected to appear in the browser; permissions are enforced by Supabase Auth and RLS. Next.js embeds these values at build time. Local `.env.local` changes require restarting the development server. For GitHub Pages, set both under repository **Settings → Secrets and variables → Actions → Variables** and rerun the Pages workflow after changes. The prebuild checker rejects privileged or invalid values before they can be embedded. It permits a local snapshot only when both values are absent; the deployment workflow requires both to be configured. [Supabase frontend key guidance](https://supabase.com/docs/guides/database/secure-data)

## 6. Run locally

Extract the refreshed source ZIP and open the folder containing `package.json`. Use Node.js **24.x** with its bundled npm. Dependencies and private environment files are not included. Configure `.env.local` as above, then run from the project root:

```sh
npm ci
npm run dev
```

Open the address printed by the server; the normal Next.js development port is **3000**. Visit `/` to see the portfolio or `/admin/` to sign in. Successful login with the allowlisted account opens `/admin/dashboard/`.

To check the production build:

```sh
npm run build
```

The production build exports static files to `out/`. After building, run `npm start` to preview that directory at `http://localhost:3000` with a static file server. `next start` is not used. GitHub Pages serves these files without Node.js, middleware/proxy, API routes, server cookies, or server actions. Exported dashboard shells are publicly downloadable; the browser checks Auth identity and administrator membership before rendering controls, and Supabase RLS independently protects records and Storage writes.

## 7. Verify your live setup

1. Open `/` in a private browser window. Confirm the portfolio is visible without login, GitHub points to `https://github.com/Derfini-CT`, and Technical Skills includes VLSI.
2. Visit `/admin/dashboard/` and a dashboard child route while signed out. The static HTML loads, then the browser should send you to `/admin/` without showing admin controls. This is a frontend redirect, not a server HTTP redirect.
3. Sign in with the allowlisted account. Add a temporary skill, edit it, change its display order, and reload the public portfolio to confirm the saved change. Cancel a deletion once, then confirm it to remove the temporary item.
4. Add a temporary project with a permitted image. Save it, reload the portfolio, then edit its fields. Confirm that changing its status to `draft` or `archived` hides it from signed-out visitors.
5. Open **Categories → Add category**, add a temporary group, and assign a temporary skill to it. Rename/reorder the category and refresh the portfolio. Confirm a category containing skills cannot be deleted. Move/remove the temporary skill before confirming category deletion. Also check **Skills → Add category** creates a category inline without discarding the skill draft; saving a category takes effect immediately, even before saving the skill.
6. In **Site content**, change a temporary piece of text and an education score, save, and refresh the public page. Check the optional profile photo upload/show/hide/remove controls and **Hero → Name size → Balanced / Original large**. Restore the original test values afterward. Text repeated in different places, such as a CGPA in About, highlights, education, and an achievement, has separate fields; update each relevant field together.
7. Confirm Certifications, Experience, and Achievements editors support add/edit/cancel/confirmed deletion and that their saved fields appear on the public page.
8. Create a temporary second Auth account in Supabase without adding it to `admin_users`. Confirm it cannot enter the dashboard. Through that account's Supabase client, verify direct Data API insert, update, delete, and Storage upload requests are rejected or modify no records. Keep session tokens private. Remove the temporary test account when finished.
9. Verify direct Data API writes without a user token are denied, including category/site text writes and profile uploads. Perform these checks through the Supabase client or REST API using the public key; SQL Editor normally uses an elevated role and does not prove visitor restrictions.
10. Log out and confirm dashboard access is blocked again. Delete temporary test records through your administrator account.

Optionally run `supabase/security-smoke.sql` in SQL Editor after applying the schema and seed. It switches PostgreSQL roles and JWT claims to check public and non-admin restrictions, admin skill CRUD, draft visibility, self-enrollment prevention, and membership revocation. Its fixtures roll back. If the script fails, execute `ROLLBACK`. This tests database authorization, not real password authentication or the Storage API.

Record results of the live checks above in [VERIFICATION.md](VERIFICATION.md). Database policy tests do not replace real administrator login, content edits, and Storage upload checks. Public content updates load when the portfolio is opened or refreshed; no source deployment is needed for a content save. Failed public Supabase reads fall back to the original content snapshot, so seeing the original portfolio alone does not prove successful configuration. A successful empty query remains empty rather than restoring deleted content.

## 8. Replace the old GitHub Pages website

Follow [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md) to verify the prepared source and publish through the existing repository without rewriting history. Both repository Actions Variables are configured and the old source is backed up. Use **Settings → Pages → Source → GitHub Actions** and the included workflow that deploys `out/` on pushes to `main`; the public address remains **https://derfini-ct.github.io/**.

In Supabase **Authentication → URL Configuration**, set **Site URL** to `https://derfini-ct.github.io/` and add **Redirect URL** `https://derfini-ct.github.io/admin/`. Optionally add `http://localhost:3000/admin/` for local redirect flows. The current email/password form navigates inside the application after login and does not require a callback endpoint. These exact existing routes avoid broad wildcards or unimplemented auth routes. [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

Build-time configuration changes require a new workflow run; live content edits do not. RLS stays enabled on all portfolio tables, including categories, site text, and the admin allowlist, and restricts content mutations to the allowlisted administrator. No service-role key, secret key, database password, or admin password belongs in the exported files.

## Common setup issues

| Symptom | What to check |
| --- | --- |
| Setup notice / no live content management | Both environment values are set, contain real values, and the local development server was restarted or the GitHub Pages workflow rebuilt after the environment change. |
| Invalid API key or failed network requests | URL and key belong to the same project; the project is active; the key is publishable or `anon`, not a secret key. |
| Login succeeds but dashboard access is refused | Confirm the authenticated user's UID is present in `public.admin_users`; an email match alone is insufficient. |
| Invalid login credentials / email not confirmed | Use the account password created in Supabase and confirm the email. Keep public signup disabled in Auth settings. |
| Missing table or RLS error | Run the complete `schema.sql` against the same project referenced by the environment file. Check both grants and policies. |
| Site content or Categories says setup is required | After the base schema, run the complete `supabase/portfolio-management.sql` in SQL Editor. It includes the earlier `site-content.sql` setup and preserves saved content. |
| A new category is missing from the skill selector | Save the category first. Check the management migration was applied to the same project; retry the list after a connection failure. |
| Category deletion is refused | Move or delete all its assigned skills first; the database prevents orphaned skills. |
| Projects absent publicly | Ensure their statuses are `unspecified`, `in_progress`, or `completed`; check display order and that seed data was loaded. |
| Image upload denied | Bucket ID is exactly `project-images`, account is allowlisted, and the file is JPEG/PNG/WebP up to 5 MiB. Profile uploads also require the policies in `portfolio-management.sql`. |
| Profile photo is uploaded but absent publicly | Enable Show profile photo in About, save site content, and refresh the portfolio. Check the bucket is public and the saved photo reference is present. |
| Name is too large | In Site content → Hero, choose Balanced and save. Original large restores the previous sizing. |
| Uploaded image is inaccessible | Ensure the bucket is public. Do not repair it by granting everyone upload/delete permission. |
| GitHub Actions fails its environment check | Add both public settings under repository Actions Variables (the workflow reads `vars`, not `secrets`), then rerun it. |
| Admin direct URL returns 404 | Publish the complete `out/` artifact, including nested directory indexes, through the new Pages workflow. |
