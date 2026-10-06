"use client";
import { createClient } from "@supabase/supabase-js";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/public-config";

const SupabaseContext = createContext<SupabaseClient | null>(null);
export function SupabaseProvider({ children }: { children: ReactNode }) {
  const config = getPublicSupabaseConfig();
  const url = config?.url; const anonKey = config?.anonKey;
  const client = useMemo(() => url && anonKey ? createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }) : null, [url, anonKey]);
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}
export function useSupabase() { return useContext(SupabaseContext); }
