"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabase } from "@/components/supabase-provider";

export default function AdminLogin() {
  const supabase = useSupabase(); const [busy, setBusy] = useState(false); const [checking, setChecking] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    async function verifyExistingSession() {
      try {
        const { data: { user }, error } = await supabase!.auth.getUser();
        if (!active || error || !user) return;
        const { data: isAdmin, error: membershipError } = await supabase!.rpc("is_portfolio_admin");
        if (active && !membershipError && isAdmin === true) window.location.replace("/admin/dashboard/");
      } catch { /* An unavailable or invalid session leaves the sign-in form available. */ }
      finally { if (active) setChecking(false); }
    }
    void verifyExistingSession();
    return () => { active = false; };
  }, [supabase]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || busy || checking) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: String(data.get("email")).trim(), password: String(data.get("password")) });
      if (signInError) { setError("Unable to sign in. Check your email and password and try again."); return; }
      const { data: { user }, error: verificationError } = await supabase.auth.getUser();
      if (verificationError || !user) { await supabase.auth.signOut({ scope: "local" }); setError("Your session could not be verified. Please sign in again."); return; }
      const { data: isAdmin, error: membershipError } = await supabase.rpc("is_portfolio_admin");
      if (membershipError || isAdmin !== true) { await supabase.auth.signOut({ scope: "local" }); setError("This account does not have admin access, or the admin database is not configured. Check your admin membership in Supabase."); return; }
      window.location.replace("/admin/dashboard/");
    } catch { setError("The sign-in service is unavailable. Please try again."); } finally { setBusy(false); }
  }
  return <main className="admin-login"><div className="admin-login-card"><Link href="/" className="admin-wordmark">Derfini C T<span>.</span></Link><div className="admin-login-icon"><LockKeyhole size={27} /></div><h1>Portfolio admin</h1><p className="admin-description">Sign in to manage your skills and projects.</p>
    {!supabase && <div className="admin-notice" role="status"><strong>Supabase setup is required</strong><p>Connect the project URL and public key, run the supplied SQL, and create your admin account using the setup guide. Login is disabled until the connection is configured.</p></div>}
    <form onSubmit={login} className="admin-login-form"><div><label htmlFor="admin-email">Email</label><Input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} disabled={!supabase || busy || checking} /></div><div><label htmlFor="admin-password">Password</label><Input id="admin-password" name="password" type="password" autoComplete="current-password" required disabled={!supabase || busy || checking} /></div>{error && <p className="admin-error" role="alert">{error}</p>}<Button type="submit" disabled={!supabase || busy || checking} className="h-11 w-full">{(busy || (supabase && checking)) && <Loader2 className="animate-spin" />}Sign in</Button></form><Link href="/" className="admin-return">Back to portfolio</Link>
  </div></main>;
}
