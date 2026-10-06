"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Award, BookOpen, BriefcaseBusiness, Code2, LayoutDashboard, LogOut, Trophy } from "lucide-react";
import { useSupabase } from "@/components/supabase-provider";
import { useAdminIdentity } from "./auth-gate";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
const menu = [{ label: "Dashboard", path: "", icon: LayoutDashboard }, { label: "Skills", path: "/skills", icon: BookOpen }, { label: "Projects", path: "/projects", icon: Code2 }, { label: "Certifications", path: "/certifications", icon: Award }, { label: "Experience", path: "/experience", icon: BriefcaseBusiness }, { label: "Achievements", path: "/achievements", icon: Trophy }];

export default function AdminShell({ children }: { children: ReactNode }) {
  const supabase = useSupabase(); const admin = useAdminIdentity(); const pathname = usePathname()?.replace(/\/$/, ""); const [loggingOut, setLoggingOut] = useState(false);
  async function logout() { if (!supabase || loggingOut) return; setLoggingOut(true); try { const { error } = await supabase.auth.signOut({ scope: "local" }); if (error) throw error; window.location.replace("/admin/"); } catch { toast.error("Unable to log out. Please try again."); setLoggingOut(false); } }
  if (!admin) return null;
  return <SidebarProvider className="admin-dashboard"><Sidebar><SidebarHeader className="p-6"><Link href="/admin/dashboard/" className="admin-wordmark">Derfini C T<span>.</span></Link><p className="text-xs text-muted-foreground">PORTFOLIO ADMIN</p></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupContent><SidebarMenu>{menu.map(item => { const path = `/admin/dashboard${item.path}`; const href = `${path}/`; return <SidebarMenuItem key={item.label}><SidebarMenuButton asChild isActive={pathname === path}><Link href={href} aria-current={pathname === path ? "page" : undefined}><item.icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter className="p-4"><p className="break-all text-sm text-muted-foreground">{admin.email || "Admin"}</p><Button variant="outline" onClick={logout} disabled={loggingOut}><LogOut />Logout</Button></SidebarFooter></Sidebar><SidebarInset><header className="admin-topbar"><SidebarTrigger /><span>Content management</span><Link href="/" target="_blank" rel="noopener noreferrer" className="ml-auto text-sm text-primary">View portfolio</Link></header><div className="admin-main">{children}</div></SidebarInset><Toaster theme="light" richColors /></SidebarProvider>;
}
