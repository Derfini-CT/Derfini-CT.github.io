import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = { title: "Portfolio Admin | Derfini C T", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <div className="admin-surface">{children}</div>; }
