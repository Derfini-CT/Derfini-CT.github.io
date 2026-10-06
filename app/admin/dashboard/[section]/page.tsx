import { notFound } from "next/navigation";
import ContentManager from "@/components/admin/content-manager";
import PreparedSection from "@/components/admin/prepared-section";
export const dynamicParams = false;
export function generateStaticParams() {
  return ["skills", "projects", "certifications", "experience", "achievements"].map(section => ({ section }));
}
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "skills" || section === "projects") return <ContentManager key={section} section={section} />;
  if (section === "certifications" || section === "experience" || section === "achievements") return <PreparedSection key={section} section={section} />;
  notFound();
}
