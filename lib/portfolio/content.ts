import { getPublicSupabaseConfig } from "../supabase/public-config";
import { getAnonymousSupabaseClient } from "../supabase/client";
import snapshot from "./initial-content.json";
import { defaultSiteContent, resolveSiteContent } from "./site";
import { type PortfolioContent, type Project, type Skill, type Certification, type Experience, type Achievement, projectImageBucket } from "./types";

export const portfolioSnapshot = { ...snapshot, site: defaultSiteContent, source: "snapshot" } as PortfolioContent;

export async function getPortfolioContent(): Promise<PortfolioContent> {
  const config = getPublicSupabaseConfig();
  if (!config) return portfolioSnapshot;
  // Public reads deliberately do not inherit the persisted administrator session.
  const supabase = getAnonymousSupabaseClient(config);
  const sorted = (table: string, columns: string) => supabase.from(table).select(columns).order("display_order").order("created_at").order("id").abortSignal(AbortSignal.timeout(6000));
  try {
    const [site, skills, projects, certifications, experiences, achievements] = await Promise.all([
      // Missing until supabase/site-content.sql is run; the built-in text covers that.
      supabase.from("site_content").select("data").eq("id", 1).abortSignal(AbortSignal.timeout(6000)).maybeSingle(),
      sorted("skills", "id,name,category,level,display_order,created_at,updated_at"),
      supabase.from("projects").select("id,title,short_description,full_description,technologies,github_url,demo_url,image_path,status,display_order,created_at,updated_at").in("status", ["unspecified", "in_progress", "completed"]).order("display_order").order("created_at").order("id").abortSignal(AbortSignal.timeout(6000)),
      sorted("certifications", "id,title,issuer,description,credential_url,issued_on,score,recognition,display_order,created_at,updated_at"),
      sorted("experiences", "id,title,organization,description,technologies,started_on,ended_on,display_order,created_at,updated_at"),
      sorted("achievements", "id,title,description,event_name,recognition,achieved_on,evidence_url,display_order,created_at,updated_at"),
    ]);
    const projectsData = (projects.error ? portfolioSnapshot.projects : projects.data || []) as Project[];
    return {
      source: [skills, projects, certifications, experiences, achievements].some(result => result.error) ? "snapshot" : "supabase",
      site: resolveSiteContent(site.error ? null : site.data?.data),
      skills: (skills.error ? portfolioSnapshot.skills : skills.data || []) as Skill[],
      projects: projectsData.map(project => ({ ...project, image_url: project.image_path ? supabase.storage.from(projectImageBucket).getPublicUrl(project.image_path).data.publicUrl : null })),
      certifications: (certifications.error ? portfolioSnapshot.certifications : certifications.data || []) as Certification[],
      experiences: (experiences.error ? portfolioSnapshot.experiences : experiences.data || []) as Experience[],
      achievements: (achievements.error ? portfolioSnapshot.achievements : achievements.data || []) as Achievement[],
    };
  } catch { return portfolioSnapshot; }
}
