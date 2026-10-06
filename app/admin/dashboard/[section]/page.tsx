import { notFound } from "next/navigation";
import ContentManager from "@/components/admin/content-manager";
const sections = ["skills", "projects", "certifications", "experience", "achievements"] as const;
export const dynamicParams = false;
export function generateStaticParams() {
  return sections.map(section => ({ section }));
}
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const match = sections.find(name => name === section);
  if (!match) notFound();
  return <ContentManager key={match} section={match} />;
}
