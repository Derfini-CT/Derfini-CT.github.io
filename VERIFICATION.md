# GitHub Pages preparation verification

Verified on October 6, 2026 with Node.js 24.19.0 and Next.js 16.3.8.

- `npm install` completed successfully with the final dependency configuration.
- A clean `npm ci` completed successfully with the included lockfile.
- `npm run build` completed, including TypeScript validation and the static artifact checker. The export contains the homepage, login, dashboard, and all five dashboard section directory indexes.
- The final build with the configured public Supabase values also passed. All eight route HTML files exist, and both generated stylesheet hashes match the prior build.
- `npm run lint` completed without errors or warnings.
- 43 checks passed against the final static export: eight HTML routes, 14 linked JavaScript/CSS assets, required portfolio content, resume/favicon, unknown-route 404, workflow configuration, unchanged public CSS/RLS SQL, and eight environment validation cases.
- Desktop and 390px mobile browser previews showed the preserved public design without horizontal overflow. Loading `/admin/dashboard/skills/` directly in the browser redirected to `/admin/` before displaying admin controls. These browser checks used an unconfigured local export, not a live Supabase session.
- `app/globals.css`, `public/Derfini_Resume.pdf`, and `supabase/schema.sql` match the previous portfolio source byte for byte. Content bindings were changed to browser fetches while retaining the public card markup, labels, and styles.
- Git ignore checks exclude private environment files, dependencies, `out/`, `.next`, and local tool state. Only the empty `.env.example` is included in the source archive.

Production dependency audit: `npm audit --omit=dev` reported zero vulnerabilities. The full development audit still reports five linked alerts for the upstream `braces` issue through Next.js ESLint tooling; the current published `braces` version is 3.0.3. Compatible dependency patches were applied, including the local preview server's compression dependency. The matched Next.js 16 lint configuration was retained rather than applying npm's suggested breaking downgrade. GitHub Pages runs no Node.js server from these development tools.

The checkout preserves the existing repository's history at old-site commit `f746afc` and replaces the old root `index.html`/`style.css` with the Next.js source. The previous site is backed up on remote branch `backup-before-nextjs-pages-2026-10-06`. Source preparation and backend verification do not themselves confirm a hosted replacement.

Hosted Supabase checks completed on October 6, 2026:

- Schema and seed applied. Anonymous Data API reads returned 19 skills, 1 project, 1 certification, 2 experiences, and 2 achievements; VLSI was present.
- `security-smoke.sql` passed against the hosted database and its fixtures rolled back. Anonymous API insert/update/delete and admin-membership access were denied.
- Hosted catalog audit confirmed RLS on all six tables, 22 public database policies, four image policies, five timestamp triggers, no anonymous write privileges, and no remaining test Auth users.
- Public `project-images` Storage bucket exists with a 5,242,880-byte limit, JPEG/PNG/WebP MIME restrictions, and four admin policies. Real image uploads have not yet been tested.
- Production Auth Site URL and admin redirect URL are saved. Both public environment values are configured in ignored `.env.local` and GitHub repository Actions Variables; privileged credentials are not included in source.
- Public Auth settings confirm signup is disabled, email login is enabled, anonymous sign-ins are disabled, and email confirmation remains required.

GitHub Pages checks completed on October 6, 2026:

- The initial Actions build and deployment succeeded for commit `de92647`; Pages uses GitHub Actions with HTTPS enforced at `https://derfini-ct.github.io/`.
- All eight production routes, 20 exported JavaScript chunks, both CSS files, the resume, and the favicon returned HTTP 200. Both CSS files matched the local export byte-for-byte. GitHub and VLSI are present.
- Browser visits to the dashboard, Skills, and Projects routes while signed out redirected to `/admin/`; the configured login form was available.
- Live checks identified repeated Auth client creation during React render retries. The client cache fix retains separate authenticated and anonymous clients; lint, build, export checks, 100-call SDK reuse/session isolation checks, and unchanged stylesheet hashes passed. Verify browser console results and the latest Actions run after deploying changes.

Administrator account creation, real password login, dashboard CRUD, and image upload checks remain pending. The deployment workflow refuses absent/invalid public configuration or a privileged key. Follow `GITHUB_PAGES_DEPLOYMENT.md` and `SUPABASE_SETUP.md` for administration and remaining end-to-end checks.
