"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import { Button } from "@/components/ui/button";
const tables = [{ table: "skills", name: "Skills", path: "skills" }, { table: "projects", name: "Projects", path: "projects" }, { table: "certifications", name: "Certifications", path: "certifications" }, { table: "experiences", name: "Experience", path: "experience" }, { table: "achievements", name: "Achievements", path: "achievements" }];
export default function DashboardOverview() {
  const supabase = useSupabase(); const [counts, setCounts] = useState<Record<string, number>>({}); const [error, setError] = useState("");
  useEffect(() => { if (!supabase) return; let cancelled = false; void Promise.all(tables.map(async ({ table }) => { const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }); if (error) throw error; return [table, count || 0] as const; })).then(rows => { if (!cancelled) setCounts(Object.fromEntries(rows)); }).catch(() => { if (!cancelled) setError("Content could not be loaded. Check the Supabase connection and run the database setup SQL."); }); return () => { cancelled = true; }; }, [supabase]);
  return <><div className="admin-page-heading"><div><h1>Dashboard</h1><p>Everything on your portfolio can be changed from here.</p></div></div>{error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-stats">
      <Link className="admin-stat" href="/admin/dashboard/site/"><span>Site content</span><strong>Text</strong><p>Name, links, hero, about, education, headings</p></Link>
      {tables.map(({ table, name, path }) => <Link className="admin-stat" href={`/admin/dashboard/${path}/`} key={table}><span>{name}</span><strong>{counts[table] ?? "—"}</strong><p>Add, edit, or remove</p></Link>)}
    </div>
    <div className="admin-information"><h2>How changes reach the portfolio</h2><p>The portfolio reads this content each time someone opens it, so a save here shows up on the next page load. There’s no rebuild or deploy to wait for. Draft and archived projects stay hidden from visitors.</p><div className="flex flex-wrap gap-3 mt-5"><Button asChild><Link href="/admin/dashboard/site/">Edit site content</Link></Button><Button asChild variant="outline"><Link href="/" target="_blank" rel="noopener noreferrer">View portfolio</Link></Button></div></div>
  </>;
}
