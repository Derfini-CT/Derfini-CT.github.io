"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/components/supabase-provider";

const AdminIdentityContext = createContext<User | null>(null);
export function useAdminIdentity() { return useContext(AdminIdentityContext); }

// GitHub Pages serves this route's static shell to everyone. Auth.getUser()
// verifies the current identity with Supabase; the membership RPC and RLS
// separately determine who may manage data. Session storage alone is not proof.
export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<User | null>(null);
  const verifiedIdentity = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let attempt = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function deny() {
      if (!active) return;
      attempt += 1;
      verifiedIdentity.current = null;
      setAdmin(null);
      window.location.replace("/admin/");
    }
    if (!supabase) { window.location.replace("/admin/"); return; }
    async function verify() {
      const currentAttempt = ++attempt;
      try {
        const { data: { user }, error } = await supabase!.auth.getUser();
        if (!active || currentAttempt !== attempt) return;
        if (error || !user) { deny(); return; }
        const { data: membership, error: membershipError } = await supabase!.rpc("is_portfolio_admin");
        if (!active || currentAttempt !== attempt) return;
        if (membershipError || membership !== true) { deny(); return; }
        verifiedIdentity.current = user.id;
        setAdmin(user);
      } catch { if (active && currentAttempt === attempt) deny(); }
    }
    void verify();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { deny(); return; }
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_IN" && session?.user.id !== verifiedIdentity.current) {
        attempt += 1;
        verifiedIdentity.current = null;
        setAdmin(null);
      }
      // Defer SDK calls until the Auth callback releases its session lock.
      const timer = setTimeout(() => { timers.delete(timer); if (active) void verify(); }, 0);
      timers.add(timer);
    });
    const onVisibility = () => { if (document.visibilityState === "visible") void verify(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; attempt += 1; subscription.unsubscribe(); timers.forEach(clearTimeout); document.removeEventListener("visibilitychange", onVisibility); };
  }, [supabase, pathname]);

  if (!supabase || !admin) return <div className="admin-loading" role="status"><Loader2 className="animate-spin" />Checking admin access…</div>;
  return <AdminIdentityContext.Provider value={admin}>{children}</AdminIdentityContext.Provider>;
}
