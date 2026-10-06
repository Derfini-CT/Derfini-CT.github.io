// Post-build gate for the GitHub Pages user site. Source checks reject features
// requiring a request-time Next.js server. Artifact checks verify real exported
// routes/assets and detect common privileged-key leaks without printing values.
// Pattern checks complement Next's exporter; they are not a complete secret audit
// and cannot validate hosted Supabase Auth, Storage, or database authorization.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const failures = [];
let checkedFiles = 0;
const relative = file => path.relative(root, file).split(path.sep).join("/");
const fail = message => failures.push(message);

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function walk(directory) {
  if (!(await exists(directory))) return [];
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`Symbolic link is not supported in a Pages artifact: ${relative(file)}`);
    } else if (entry.isDirectory()) {
      files.push(...await walk(file));
    } else if (entry.isFile()) {
      files.push(file);
    }
  }
  return files;
}

function inspectSecrets(text, filename) {
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) {
    fail(`A Supabase secret-key pattern appears in ${filename}; remove it before publication.`);
  }
  if (/(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/.test(text)) {
    fail(`A GitHub access-token pattern appears in ${filename}; remove it before publication.`);
  }
  const jwtPattern = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{8,}/g;
  for (const match of text.matchAll(jwtPattern)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split(".")[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") {
        fail(`A service-role JWT appears in ${filename}; remove it before publication.`);
      }
    } catch { /* Other dotted strings are not necessarily JWTs. */ }
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
    fail(`A private-key block appears in ${filename}; remove it before publication.`);
  }
}

const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
for (const dependency of ["@supabase/ssr", "server-only"]) {
  if (dependency in dependencies) fail(`Remove server-only dependency ${dependency} from the static project.`);
}
if (Object.values(packageJson.scripts ?? {}).some(command => /\bnext\s+start\b/.test(command))) {
  fail("Package scripts must serve out/ statically; next start requires a Next.js server.");
}

const configPath = path.join(root, "next.config.ts");
const config = await fs.readFile(configPath, "utf8");
if (!/\boutput\s*:\s*["']export["']/.test(config)) fail("next.config.ts must set output: 'export'.");
if (!/\btrailingSlash\s*:\s*true\b/.test(config)) fail("next.config.ts must set trailingSlash: true for directory index routes.");
if (!/\bunoptimized\s*:\s*true\b/.test(config)) fail("next.config.ts must disable runtime image optimization with images.unoptimized: true.");
if (/\b(?:basePath|assetPrefix)\s*:/.test(config)) fail("The GitHub Pages user site uses the repository root; remove basePath and assetPrefix.");

for (const basename of ["proxy", "middleware"]) {
  for (const extension of ["ts", "tsx", "js", "mjs", "cjs"]) {
    for (const prefix of ["", "src"]) {
      const file = path.join(root, prefix, `${basename}.${extension}`);
      if (await exists(file)) fail(`Request middleware/proxy cannot run on GitHub Pages: ${relative(file)}`);
    }
  }
}

const sourceFiles = (await Promise.all(["app", "components", "lib", "hooks", "src"].map(directory => walk(path.join(root, directory))))).flat();
const allowedEnv = new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
for (const file of sourceFiles) {
  if (!/\.(?:[cm]?js|jsx|ts|tsx)$/.test(file)) continue;
  checkedFiles += 1;
  const text = await fs.readFile(file, "utf8");
  const filename = relative(file);
  if (/(?:^|\n)\s*["']use server["']\s*;?/.test(text)) fail(`Server Actions cannot run on GitHub Pages: ${filename}`);
  if (/(?:from\s*|import\s*|require\s*\(\s*)["'](?:server-only|@supabase\/ssr|next\/headers|next\/server)["']/.test(text)) {
    fail(`Server runtime import found in ${filename}.`);
  }
  if (/^(?:app|src\/app)\/.+\/(?:route)\.(?:ts|js)$/.test(filename) || /^(?:app|src\/app)\/(?:route)\.(?:ts|js)$/.test(filename)) {
    fail(`Route handlers must be removed from this browser-only project: ${filename}`);
  }
  if (/\bexport\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(text) || /\bexport\s+const\s+runtime\s*=/.test(text)) {
    fail(`Request-time runtime configuration found in ${filename}.`);
  }
  for (const match of text.matchAll(/\bprocess\s*\.\s*env\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
    if (!allowedEnv.has(match[1])) fail(`Unexpected environment reference ${match[1]} in ${filename}. Only the two public Supabase variables belong in browser source.`);
  }
  if (/\bprocess\s*\.\s*env\s*\[/.test(text)) fail(`Computed environment access is not supported for this static browser configuration: ${filename}`);
  inspectSecrets(text, filename);
}

const requiredRoutes = [
  "index.html",
  "admin/index.html",
  "admin/dashboard/index.html",
  ...["skills", "projects", "certifications", "experience", "achievements"].map(section => `admin/dashboard/${section}/index.html`),
];
for (const route of requiredRoutes) {
  const file = path.join(out, ...route.split("/"));
  if (!(await exists(file))) {
    fail(`Missing exported route out/${route}.`);
  } else {
    const text = await fs.readFile(file, "utf8");
    if (!/<html(?:\s|>)/i.test(text)) fail(`Exported route is not an HTML document: out/${route}.`);
    if (/_next\/image\?/.test(text)) fail(`Runtime image-optimizer URL found in out/${route}.`);
  }
}

for (const asset of ["Derfini_Resume.pdf", "favicon.svg", ".nojekyll"]) {
  if (!(await exists(path.join(out, asset)))) fail(`Missing public asset out/${asset}.`);
}
if (await exists(path.join(out, "Derfini_Resume.pdf"))) {
  const bytes = await fs.readFile(path.join(out, "Derfini_Resume.pdf"));
  if (bytes.subarray(0, 5).toString() !== "%PDF-") fail("out/Derfini_Resume.pdf does not have a PDF header.");
}
if (await exists(path.join(out, "favicon.svg"))) {
  if (!/<svg(?:\s|>)/i.test(await fs.readFile(path.join(out, "favicon.svg"), "utf8"))) fail("out/favicon.svg does not contain an SVG element.");
}

const outputFiles = await walk(out);
if (!outputFiles.some(file => relative(file).startsWith("out/_next/static/") && file.endsWith(".js"))) fail("Export contains no Next.js static JavaScript assets.");
if (!outputFiles.some(file => relative(file).startsWith("out/_next/static/") && file.endsWith(".css"))) fail("Export contains no static CSS assets.");
for (const file of outputFiles) {
  const filename = relative(file);
  if (/(?:^|\/)\.env(?:[./]|$)/.test(filename) || /(?:^|\/)(?:node_modules|\.git|server)(?:\/|$)/.test(filename)) {
    fail(`Non-public/server file must not be exported: ${filename}`);
  }
  if (/\.(?:html|js|mjs|json|txt|css|map|xml|svg)$/.test(file)) inspectSecrets(await fs.readFile(file, "utf8"), filename);
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) console.error(`[static-export] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[static-export] Verified ${requiredRoutes.length} HTML routes, resume/favicon/.nojekyll, static JS/CSS, and ${checkedFiles} browser source files. No request-time server features or common privileged-key patterns detected.`);
}
