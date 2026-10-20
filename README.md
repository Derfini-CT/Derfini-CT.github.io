# Derfini C T — Portfolio

The existing React + Tailwind portfolio prepared for **GitHub Pages** at **https://derfini-ct.github.io/**. This checkout preserves the history of **Derfini-CT/Derfini-CT.github.io**. The replacement source was prepared on **codex/github-pages-portfolio**, starting with commit **ee65b3c**. The public colors, typography, layout, spacing, cards, and animations are preserved.

## Publish

Follow [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md) to publish the prepared source while preserving repository history. The included `.github/workflows/deploy-pages.yml` uses Node.js **24.x**, installs with `npm ci`, builds with `npm run build`, and publishes the generated **`out/`** directory. Use repository **Settings → Pages → Source → GitHub Actions**.

Both public Supabase values are configured in ignored `.env.local` and repository **Settings → Secrets and variables → Actions → Variables**. Keep these names when configuring another checkout or updating the connection:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PROJECT-PUBLISHABLE-OR-ANON-KEY
```

These values are embedded in the exported browser files. Changes require another build/deployment. Never use a service-role/secret key or an admin password.

## Run locally

Use Node.js 24.x with its bundled npm. From the folder containing `package.json`:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Edit `.env.local` with the same two values, then run:

```powershell
npm run dev
```

Open `http://localhost:3000`. Verify the static export with:

```powershell
npm run build
```

Run `npm start` to serve `out/` locally at `http://localhost:3000` and inspect the production files; do not open them using `file://`. `next start` is not the server for an exported site. `npm run typecheck` and `npm run lint` are available for source checks.

## Static hosting with dynamic content

Next.js exports HTML/CSS/JavaScript using `output: "export"`, `trailingSlash: true`, and unoptimized images. Routes have directory indexes, including `/admin/` and `/admin/dashboard/`. Node runs during development/building; GitHub Pages serves static files. No Next.js server, middleware/proxy, server cookies, API routes, or server image optimizer runs on Pages. [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)

Supabase is the backend. The browser loads site text, skill categories, Skills, Projects, Certifications, Experience, and Achievements from Supabase without replacing the public design. Successful empty reads remain empty. Original content is available while the project is not configured or reads fail; seeing original content alone does not prove a live connection.

## Administration and security

- `/`: public portfolio; no login required.
- `/admin/`: Supabase email/password login.
- `/admin/dashboard/`: browser verifies authentication and membership in `public.admin_users` before showing admin content.
- `/admin/dashboard/site/`: edit the name, profile links, optional photo, hero, About, education and marks, highlights, focus areas, headings, soft skills, contact/footer text, navigation labels, buttons, and form wording.
- `/admin/dashboard/categories/`: add, rename, describe, reorder, and delete empty skill categories.
- Skills, Projects, Certifications, Experience, and Achievements: add, edit, save, cancel, and confirmed deletion.

Projects support JPEG/PNG/WebP uploads up to 5 MB and confirmed image replacement. In **Projects → Edit → Crop & edit image**, choose Original, 16:9, 4:3 or Square; adjust zoom and position, rotate, or reset. **Apply crop** prepares a JPEG locally; **Save → Save and replace** publishes it. Cancel crop keeps the selected image, and Reset to saved image discards pending edits. Previous files remain in Storage when an image is replaced. Public cards adapt to screen size and may trim image edges.

Browser guards send unauthenticated or unauthorized users to `/admin/`. Exported dashboard HTML and JavaScript are publicly downloadable; they contain no private portfolio records or passwords. **Supabase RLS is the security boundary**: only allowlisted administrators can write database content or Storage objects. A successful login alone does not grant administrator rights.

## Edit the portfolio without source changes

1. Sign in at `/admin/`, then open **Site content**. Edit personal text, education scores, section headings, or links, and choose **Save site content**. **Buttons, navigation & form text** contains the remaining public labels and empty-state wording.
2. In **Site content → Hero → Name size**, choose **Compact & balanced** for a smaller name or **Original large** for the previous sizing. Both use the same typeface, colours, and animated lettering.
3. In **Site content → Profile**, optionally upload a clear portrait in JPEG, PNG, or WebP format, up to **5 MiB**. Enable **Show profile photo in About**, add a short photo description, and save. No photo is supplied or invented by default. You can replace it, hide it with the switch, or confirm **Remove displayed photo**. Replacing/removing changes the saved reference; previous files remain in Supabase Storage. An uploaded file is also retained if a save cannot be confirmed, so an ambiguous network response cannot delete a photo that was saved.
4. Open **Categories → Add category** to create a skill group with a name, optional description, and display order. Rename a category without losing its assigned skills. Move its skills to another category before deleting it; the database prevents deleting an in-use category.
5. Open **Skills → Add skill**. Choose an existing category, or use **Add category** beside the selector to create one while keeping the skill draft. Set the skill name, optional level, and order, then save. VLSI stays in the existing technical category unless you move it.
6. Use the other sidebar pages to manage projects, certifications, experience, and achievements. Refresh the public portfolio after saving to see the changes; content edits do not require a Git commit or deployment.

## Supabase setup

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for the base schema/RLS SQL, seed content including VLSI, administrator provisioning, the `project-images` bucket, and Auth URLs. For the text/category/photo features, run **`supabase/portfolio-management.sql`** in the Supabase SQL Editor as the project owner after `schema.sql`. It includes the `site_content` setup from `supabase/site-content.sql`, adds skill categories, preserves existing content/category edits, and permits admin profile-photo uploads. If you already ran `site-content.sql`, run `portfolio-management.sql` next; otherwise the new file alone supplies both updates. Do not rerun the original seed over edited live content. No service-role key, secret key, database password, or admin password is needed in the app or GitHub Actions. No real Supabase values or account passwords are committed in this source. Consult [VERIFICATION.md](VERIFICATION.md) for completed checks and any remaining live verification.

`.gitignore` excludes `.env.local`, dependencies, generated `out/` and `.next` output, and local tool state. Keep `.git` in this existing checkout to retain repository history. The old `main` commit **f746afc** is already backed up on remote branch **backup-before-nextjs-pages-2026-10-06**; never reset or force-push the repository history.

The contact form retains its mailto draft behavior. Missing personal facts retain their placeholders. Confirm a successful Pages deployment and the live-site checks in [VERIFICATION.md](VERIFICATION.md); source and backend checks alone do not prove a hosted deployment.
