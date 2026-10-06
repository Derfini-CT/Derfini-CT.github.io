import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PublicSupabaseConfig } from "../portfolio/types";

// React may retry an initial render before committing its useMemo values.
// Keep SDK instances outside the component lifecycle for each connection.
const authenticatedClients = new Map<string, SupabaseClient>();
const anonymousClients = new Map<string, SupabaseClient>();
const connectionKey = ({ url, anonKey }: PublicSupabaseConfig) => JSON.stringify([url, anonKey]);

export function getAuthenticatedSupabaseClient(config: PublicSupabaseConfig): SupabaseClient {
  const key = connectionKey(config);
  let client = authenticatedClients.get(key);
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    authenticatedClients.set(key, client);
  }
  return client;
}

export function getAnonymousSupabaseClient(config: PublicSupabaseConfig): SupabaseClient {
  const key = connectionKey(config);
  let client = anonymousClients.get(key);
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        storageKey: `derfini-portfolio-public-${new URL(config.url).host}`,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
    anonymousClients.set(key, client);
  }
  return client;
}
