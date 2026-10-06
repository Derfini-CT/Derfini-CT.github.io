# Replace the existing GitHub Pages portfolio

Repository: [Derfini-CT/Derfini-CT.github.io](https://github.com/Derfini-CT/Derfini-CT.github.io)

Public address: [https://derfini-ct.github.io/](https://derfini-ct.github.io/)

This prepared checkout retains the old repository's Git history. The replacement builds a Next.js static export and deploys `out/` through GitHub Actions; Supabase supplies live content, authentication, and image Storage. The files are prepared locally. They have not been pushed or published automatically.

## 1. Preserve the previous site

Open PowerShell in the prepared **existing checkout**:

```powershell
Set-Location -LiteralPath "C:\Users\NIJIN V L\Documents\Codex\2026-10-06\create-a-modern-professional-responsive-personal\outputs\derfini-portfolio-pages"
git remote -v
git branch --show-current
git fetch origin
git log -1 --oneline
git status --short
```

Confirm `origin` is `https://github.com/Derfini-CT/Derfini-CT.github.io.git` and the branch is `main`. If the remote has changed since this checkout was prepared, integrate those changes before pushing; do not overwrite newer remote commits.

Before committing the replacement, create a backup branch from the old committed site:

```powershell
git branch backup-before-nextjs-pages-2026-10-06 HEAD
git push origin backup-before-nextjs-pages-2026-10-06
```

If that branch name already exists, inspect it and reuse the correct backup or choose a unique name. The backup preserves the old committed `index.html`, `style.css`, and other tracked files. The prepared working tree already removes the old root `index.html` and `style.css`; their previous versions remain in Git history and the backup branch. Do not delete `.git`, reset history, or force-push.

If using a source ZIP rather than this checkout, first clone the existing repository and make its backup branch:

```powershell
git clone https://github.com/Derfini-CT/Derfini-CT.github.io.git
Set-Location -LiteralPath ./Derfini-CT.github.io
git branch backup-before-nextjs-pages-2026-10-06
git push origin backup-before-nextjs-pages-2026-10-06
```

Copy the extracted source contents (including `.github`, `.gitignore`, and `.env.example`) into this clone while preserving `.git`. Remove only the old root `index.html` and `style.css` after backing up, and review the diff before committing. Do not create a new repository or run `git init` over an unrelated directory.

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

## 4. Build and push

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

Review and commit using normal Git history:

```powershell
git add -A
git status --short
git ls-files .env.local
git diff --cached --stat
git commit -m "Replace existing portfolio with Next.js and Supabase"
git push origin main
```

`git ls-files .env.local` should return nothing. Include `.env.example`, workflow, source, SQL, and documentation; dependencies and generated output stay ignored. Authenticate using your normal Git credential flow. If `main` advanced, integrate its changes before pushing; do not force-push.

If Git requests an author identity, configure your own name and GitHub email with `git config --local user.name "YOUR NAME"` and `git config --local user.email "YOUR GITHUB EMAIL"`, then retry the commit. Keep GitHub tokens out of source and remote URLs.

## 5. Confirm deployment

Open **Actions**, select the new Pages workflow, and wait for both build and deploy jobs to succeed. Pushing `main` triggers it; **Run workflow** can trigger it again after changing repository variables. Check its deployment URL, then visit **https://derfini-ct.github.io/**.

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
