import type { PublicSupabaseConfig } from "../portfolio/types";

// Only public browser credentials may be embedded in the static export.
export function validatePublicConfig(urlValue: unknown, keyValue: unknown): PublicSupabaseConfig | null {
  if (typeof urlValue !== "string" || typeof keyValue !== "string" || !keyValue.trim()) return null;
  try {
    const url = new URL(urlValue.trim());
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    const anonKey = keyValue.trim();
    if (anonKey.startsWith("sb_secret_")) return null;
    if (!anonKey.startsWith("sb_publishable_")) {
      const payload = anonKey.split(".")[1];
      if (!payload || JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role !== "anon") return null;
    }
    return { url: url.origin, anonKey };
  } catch { return null; }
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  // Direct references are required so Next.js embeds these values at build time.
  return validatePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
