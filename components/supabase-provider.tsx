"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/supabase/public-config";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/client";

const SupabaseContext = createContext<SupabaseClient | null>(null);
export function SupabaseProvider({ children }: { children: ReactNode }) {
  const config = getPublicSupabaseConfig();
  const client = config ? getAuthenticatedSupabaseClient(config) : null;
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}
export function useSupabase() { return useContext(SupabaseContext); }
