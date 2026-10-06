# Derfini C T — Portfolio

The existing React + Tailwind portfolio prepared for **GitHub Pages** at **https://derfini-ct.github.io/**. This checkout preserves the history of **Derfini-CT/Derfini-CT.github.io**. The replacement source is committed and pushed on **codex/github-pages-portfolio**, starting with commit **ee65b3c**. **main** and the live site still contain the old portfolio at **f746afc**. The public colors, typography, layout, spacing, cards, and animations are preserved in the replacement.

## Publish

Follow [GITHUB_PAGES_DEPLOYMENT.md](GITHUB_PAGES_DEPLOYMENT.md) to finish Supabase setup and fast-forward the existing `main` branch to the prepared source. The included `.github/workflows/deploy-pages.yml` uses Node.js **24.x**, installs with `npm ci`, builds with `npm run build`, and publishes the generated **`out/`** directory. Set repository **Settings → Pages → Source → GitHub Actions** when ready to publish the replacement.

The required Supabase values are still missing. Add them under **Settings → Secrets and variables → Actions → Variables** before publishing:

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

Supabase is the backend. The browser loads Skills, Projects, Certifications, Experience, and Achievements from Supabase without changing their existing public card design. Successful empty reads remain empty. Original content is available while the project is not configured or reads fail; seeing original content alone does not prove a live connection.

## Administration and security

- `/`: public portfolio; no login required.
- `/admin/`: Supabase email/password login.
- `/admin/dashboard/`: browser verifies authentication and membership in `public.admin_users` before showing admin content.
- `/admin/dashboard/skills/` and `/admin/dashboard/projects/`: add, edit, save, cancel, and confirmed deletion.
- Certifications, Experience, and Achievements: saved-record previews; editing screens are prepared for a future update.

Projects support JPEG/PNG/WebP uploads up to 5 MB and confirmed image replacement. Browser guards send unauthenticated or unauthorized users to `/admin/`. Exported dashboard HTML and JavaScript are publicly downloadable; they contain no private portfolio records or passwords. **Supabase RLS is the security boundary**: only allowlisted administrators can write database content or Storage objects. A successful login alone does not grant administrator rights.

## Supabase setup

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for schema/RLS SQL, seed content including VLSI, administrator provisioning, the `project-images` bucket, and Auth URLs. Reuse the existing Supabase project if already configured. No real Supabase values or account passwords are included in this source.

`.gitignore` excludes `.env.local`, dependencies, generated `out/` and `.next` output, and local tool state. Keep `.git` in this existing checkout to retain repository history. The old `main` commit **f746afc** is already backed up on remote branch **backup-before-nextjs-pages-2026-10-06**; never reset or force-push the repository history.

The contact form retains its mailto draft behavior. Missing personal facts retain their placeholders. Pushing the migration branch has not replaced the live site. Finish Supabase configuration, advance `main` using the deployment guide, and confirm a successful Actions deployment.
