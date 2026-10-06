import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/components/supabase-provider";

export const metadata: Metadata = {
  title: "Derfini C T | Electronics & Communication Engineering Portfolio",
  description: "Explore Derfini C T’s ECE portfolio: embedded systems and data analytics internships, a Power BI solar PV project, a 9.45/10 CGPA, and NPTEL certification.",
  other: {
    "theme-color": "#13243e",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><SupabaseProvider>{children}</SupabaseProvider></body>
    </html>
  );
}
