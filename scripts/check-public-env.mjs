// Run before Next builds: it loads the same production .env files as Next,
// validates shape/public-key role, and never logs values or makes API requests.
// --allow-missing permits an unconfigured local snapshot only when BOTH variables
// are absent; CI omits it. Validation does not prove actual project access.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd(), false, {
  info: () => {},
  error: () => console.error("[public-env] A production environment file could not be loaded."),
});

const errors = [];
const allowMissing = process.argv.includes("--allow-missing");
const bothAbsent = process.env.NEXT_PUBLIC_SUPABASE_URL === undefined && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined;
const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const keyValue = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!urlValue && !(allowMissing && bothAbsent)) {
  errors.push("Set the repository variable NEXT_PUBLIC_SUPABASE_URL.");
} else if (urlValue) {
  try {
    const url = new URL(urlValue);
    if (
      url.protocol !== "https:" ||
      url.username || url.password || url.search || url.hash ||
      !["", "/"].includes(url.pathname) ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      /(^|[.-])(your-project|example|placeholder|changeme)([.-]|$)/i.test(url.hostname)
    ) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL must be your project's HTTPS root URL without credentials, a path, query, or fragment.");
    }
  } catch {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is not a valid HTTPS project URL.");
  }
}

if (!keyValue && !(allowMissing && bothAbsent)) {
  errors.push("Set the repository variable NEXT_PUBLIC_SUPABASE_ANON_KEY to the anon or publishable browser key.");
} else if (keyValue && /^sb_secret_/i.test(keyValue)) {
  errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY contains a privileged secret key. Use the anon or publishable browser key.");
} else if (keyValue?.startsWith("sb_publishable_")) {
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(keyValue)) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not a valid publishable-key format.");
  }
} else if (keyValue) {
  try {
    const segments = keyValue.split(".");
    if (segments.length !== 3 || segments.some(segment => !/^[A-Za-z0-9_-]+$/.test(segment))) {
      throw new Error("Malformed JWT");
    }
    const header = JSON.parse(Buffer.from(segments[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    if (!header.alg || header.alg === "none" || payload.role !== "anon") {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY must have the anon role. Authenticated-user and service-role tokens are forbidden.");
    } else if (typeof payload.exp === "number" && payload.exp <= Date.now() / 1000) {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY has expired. Copy the current anon or publishable browser key from Supabase.");
    }
  } catch {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase anon JWT or publishable browser key.");
  }
}

for (const name of Object.keys(process.env)) {
  if (name.startsWith("NEXT_PUBLIC_") && /(?:SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY)/i.test(name)) {
    errors.push(`Remove privileged browser environment variable ${name}.`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`[public-env] ${error}`);
  process.exitCode = 1;
} else {
  console.log(allowMissing && bothAbsent
    ? "[public-env] Both Supabase variables are absent; building an unconfigured local snapshot."
    : "[public-env] Public Supabase configuration format validated. Key values are hidden.");
}
