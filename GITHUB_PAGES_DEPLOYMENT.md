# Replace the existing GitHub Pages portfolio

Repository: [Derfini-CT/Derfini-CT.github.io](https://github.com/Derfini-CT/Derfini-CT.github.io)

Public address: [https://derfini-ct.github.io/](https://derfini-ct.github.io/)

This checkout retains the old repository's Git history. The replacement source is already committed and pushed on **codex/github-pages-portfolio**, starting with **ee65b3c**. The old **main** commit **f746afc** is backed up on remote branch **backup-before-nextjs-pages-2026-10-06**. **main and the live site still contain the old portfolio.** The Supabase project URL and public key are still missing; complete their setup before publishing the replacement.

The new site builds a Next.js static export and deploys `out/` through GitHub Actions. Supabase supplies live content, authentication, and image Storage after configuration.

## 1. Use the prepared migration branch

Open PowerShell in the prepared **existing checkout**:

```powershell
Set-Location -LiteralPath "C:\Users\NIJIN V L\Documents\Codex\2026-10-06\create-a-modern-professional-responsive-personal\outputs\derfini-portfolio-pages"
git remote -v
git branch --show-current
git fetch origin
git log -1 --oneline
git status --short
```

Confirm `origin` is `https://github.com/Derfini-CT/Derfini-CT.github.io.git` and the branch is `codex/github-pages-portfolio`. Its initial replacement commit is `ee65b3c`; documentation updates may follow it. Check that the working tree is clean before switching branches. If remote `main` has advanced, integrate its changes before publishing; do not overwrite newer remote commits.

The backup already exists locally and remotely at the old committed site **f746afc**. Inspect it instead of creating a new backup from the migration branch:

```powershell
git log -1 --oneline origin/backup-before-nextjs-pages-2026-10-06
```

The backup preserves the old `index.html`, `style.css`, and other tracked files. Their removal is already committed in the migration branch; their previous versions remain in Git history and the backup. Do not delete `.git`, reset history, force-push, or recreate the backup at the replacement commit.

On another computer, clone the prepared branch directly:

```powershell
git clone --branch codex/github-pages-portfolio https://github.com/Derfini-CT/Derfini-CT.github.io.git
Set-Location -LiteralPath ./Derfini-CT.github.io
```

This retrieves the prepared source and existing history; no ZIP overlay, old-file deletion, new repository, or `git init` is needed. If applying further files from a ZIP, preserve `.git`, review the diff, and commit those changes on the migration branch.

## 2. Connect Supabase

Reuse the existing Supabase project if already set up. Otherwise follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md): run `supabase/schema.sql`, then `supabase/seed.sql`; create a confirmed email/password Auth user; allowlist its UID with `supabase/create-admin.sql`; and create the public `project-images` bucket. Table RLS and Storage policies admit writes only for allowlisted administrators.

In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables → New repository variable**. Create:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Its publishable key or legacy `anon` key |

The workflow uses repository `vars`, so put these under **Variables**. These are public browser settings; never supply a service-role/secret key, database password, or admin password. The Next.js export embeds these values while building. After changing either variable, run the build/deployment workflow again. [GitHub repository variables](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables), [Next.js public environment variables](https://nextjs.org/docs/app/guides/environment-variables)

Configure **Supabase → Authentication → URL Configuration**:

| Setting | Value |
| --- | --- |
| Site URL | `https://derfini-ct.github.io/` |
| Allowed Redirect URL | `https://derfini-ct.github.io/admin/` |
| Optional local Redirect URL | `http://localhost:3000/admin/` |

The current password login navigates inside the app and needs no OAuth/email callback endpoint. These redirects use existing routes; no wildcard or invented callback is needed. Keep public signup and anonymous Auth signup disabled. Public portfolio visitors need no Auth accounts. [Supabase URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)

## 3. Use one Pages workflow

In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**. The included `.github/workflows/deploy-pages.yml` builds with Node 24 and `npm ci`, uploads **`out/`** using the Pages artifact action, then deploys it with Pages permissions. It publishes the generated site. [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

If an older custom workflow also publishes Pages, disable it in **Actions → old workflow → … → Disable workflow** before triggering this replacement. Keep the new workflow enabled. Switching away from **Deploy from a branch** removes the old branch publishing source; use one active deployment workflow so an older build cannot replace the new site. [Disable a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)

## 4. Verify, then fast-forward main

With Node.js 24.x and npm, run locally:

```powershell
npm install
Copy-Item .env.example .env.local
```

Fill `.env.local` with the same public URL/key, then run:

```powershell
npm run typecheck
npm run lint
npm run build
```

Use `npm start` to preview the built files locally. CI uses `npm ci` with the supplied lockfile. The build creates `out/index.html`, `out/admin/index.html`, and exported dashboard directories. `trailingSlash: true` lets Pages serve their directory indexes. Images load directly without a Next.js image server. This user-site repository serves `/`, so it needs no repository-name `basePath`. [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)

The source replacement is already committed and pushed. If you make additional source or documentation changes, review and save them on the migration branch first:

```powershell
git add -A
git status --short
git ls-files .env.local
git diff --cached --stat
git commit -m "Update prepared GitHub Pages portfolio"
git push origin codex/github-pages-portfolio
```

Skip that commit block if there are no changes. `git ls-files .env.local` should return nothing. Dependencies and generated output stay ignored. Authenticate using your normal Git credential flow.

After Supabase configuration and build verification, with a clean working tree, advance `main` using normal history:

```powershell
git fetch origin
git switch codex/github-pages-portfolio
git pull --ff-only origin codex/github-pages-portfolio
git switch main
git pull --ff-only origin main
git merge --ff-only codex/github-pages-portfolio
git push origin main
```

This moves `main` forward to the prepared branch; it does not reset history or change the backup. If a fast-forward step fails because `main` advanced independently, stop and integrate its changes into the migration branch normally before retrying. Do not force-push.

If Git requests an author identity, configure your own name and GitHub email with `git config --local user.name "YOUR NAME"` and `git config --local user.email "YOUR GITHUB EMAIL"`, then retry the commit. Keep GitHub tokens out of source and remote URLs.

## 5. Confirm deployment

After the replacement reaches `main`, open **Actions**, select the new Pages workflow, and wait for both build and deploy jobs to succeed. Pushing `main` triggers it; **Run workflow** on `main` can trigger it again after changing repository variables. The workflow may not appear in the default-branch Actions list until it reaches `main`. Check its deployment URL, then visit **https://derfini-ct.github.io/**. The old site remains the expected live result until the new deployment succeeds.

- In a private browser window, `/` stays public with the existing design, resume, LinkedIn, GitHub button, and VLSI skill.
- Directly reload `/admin/` and `/admin/dashboard/skills/` to confirm exported routes resolve without 404.
- While signed out, dashboard pages show no admin content and the browser redirects to `/admin/`.
- Sign in with the allowlisted administrator; test temporary skill/project add, edit, confirmed deletion, and permitted image upload. Refresh the public page to confirm changes without rebuilding.
- Confirm an Auth user absent from `public.admin_users` cannot use editors or write through the Supabase API. Log out and confirm access is blocked again.

Pages serves public static dashboard files; the browser guards their interface. Supabase RLS protects real database and Storage operations even if someone bypasses the frontend. Real login/write/upload checks remain necessary after Supabase setup and publication.

If the old page persists, check the new workflow succeeded, Source is **GitHub Actions**, and no old deployment workflow remains enabled. If login says setup is required, check both repository variables and rebuild. Static Pages deployments need a build to use changed environment values.

## 6. Updates and rollback

Source changes use normal commits and pushes to `main`. Dashboard Skills/Projects edits need no Git commit. Certifications, Experience, and Achievements also load dynamically on the public site; their admin editors remain a future update.

To restore the old site quickly, disable the new workflow, then select **Settings → Pages → Source → Deploy from a branch**, **backup-before-nextjs-pages-2026-10-06** (or your actual backup branch), and **/(root)**. This republishes the previous site without rewriting `main`. For a permanent source rollback, revert the replacement commit with normal `git revert REPLACEMENT_COMMIT_SHA` and `git push origin main`; inspect the files and publishing settings before deploying. Reenable the new workflow and **GitHub Actions** source when restoring the new portfolio.
