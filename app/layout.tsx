import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/components/supabase-provider";

export const metadata: Metadata = {
  title: "Derfini C T | Electronics & Communication Engineering Portfolio",
  description: "Explore Derfini C T’s ECE portfolio: embedded systems and data analytics internships, a Power BI solar PV project, a 9.45/10 CGPA, and NPTEL certification.",
  other: {
    "theme-color": "#0b2620",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Hanken+Grotesk:wght@400..700&display=swap" />
      </head>
      <body className="antialiased"><SupabaseProvider>{children}</SupabaseProvider></body>
    </html>
  );
}
