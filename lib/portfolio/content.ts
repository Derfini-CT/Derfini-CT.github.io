import { getPublicSupabaseConfig } from "../supabase/public-config";
import { getAnonymousSupabaseClient } from "../supabase/client";
import snapshot from "./initial-content.json";
import { defaultSiteContent, resolveSiteContent, type SiteContent } from "./site";
import { type PortfolioContent, type Project, type Skill, type SkillCategoryRecord, type Certification, type Experience, type Achievement, projectImageBucket, skillCategories } from "./types";

export function fallbackSkillCategories(site: SiteContent): SkillCategoryRecord[] {
  return skillCategories.map((category, index) => ({ ...category, ...site.skillGroups[category.key], id: `snapshot-${category.key}`, display_order: index, created_at: "", updated_at: "" }));
}

// A partial migration or an old content snapshot must never hide skills whose
// category is not in the fetched list. Existing database categories remain primary.
export function includeSkillCategories(categories: SkillCategoryRecord[], skills: Pick<Skill, "category">[], site: SiteContent): SkillCategoryRecord[] {
  const result = [...categories]; const keys = new Set(result.map(category => category.key));
  for (const skill of skills) {
    if (keys.has(skill.category)) continue;
    const legacy = fallbackSkillCategories(site).find(category => category.key === skill.category);
    result.push(legacy || { id: `fallback-${skill.category}`, key: skill.category, title: skill.category.replace(/[-_]/g, " ").replace(/^./, character => character.toUpperCase()), description: "", display_order: result.length, created_at: "", updated_at: "" });
    keys.add(skill.category);
  }
  return result;
}

// Static fallback images use the same public bucket as the live records. Building
// their URLs requires no session or network request, so they also survive a DB outage.
const snapshotConfig = getPublicSupabaseConfig();
const snapshotImageUrl = (path: string | null) => snapshotConfig && path ? `${snapshotConfig.url}/storage/v1/object/public/${projectImageBucket}/${path.split("/").map(encodeURIComponent).join("/")}` : null;

export const portfolioSnapshot = {
  ...snapshot,
  projects: snapshot.projects.map(project => ({ ...project, image_url: snapshotImageUrl(project.image_path) })),
  site: defaultSiteContent,
  categories: fallbackSkillCategories(defaultSiteContent),
  profileImageUrl: defaultSiteContent.profile.showPhoto ? snapshotImageUrl(defaultSiteContent.profile.photoPath) : null,
  source: "snapshot",
} as PortfolioContent;

export async function getPortfolioContent(): Promise<PortfolioContent> {
  const config = getPublicSupabaseConfig();
  if (!config) return portfolioSnapshot;
  // Public reads deliberately do not inherit the persisted administrator session.
  const supabase = getAnonymousSupabaseClient(config);
  const sorted = (table: string, columns: string) => supabase.from(table).select(columns).order("display_order").order("created_at").order("id").abortSignal(AbortSignal.timeout(6000));
  try {
    const [site, categories, skills, projects, certifications, experiences, achievements] = await Promise.all([
      // Missing until supabase/site-content.sql is run; the built-in text covers that.
      supabase.from("site_content").select("data").eq("id", 1).abortSignal(AbortSignal.timeout(6000)).maybeSingle(),
      sorted("skill_categories", "id,key,title,description,display_order,created_at,updated_at"),
      sorted("skills", "id,name,category,level,display_order,created_at,updated_at"),
      supabase.from("projects").select("id,title,short_description,full_description,technologies,github_url,demo_url,image_path,status,display_order,created_at,updated_at").in("status", ["unspecified", "in_progress", "completed"]).order("display_order").order("created_at").order("id").abortSignal(AbortSignal.timeout(6000)),
      sorted("certifications", "id,title,issuer,description,credential_url,issued_on,score,recognition,display_order,created_at,updated_at"),
      sorted("experiences", "id,title,organization,description,technologies,started_on,ended_on,display_order,created_at,updated_at"),
      sorted("achievements", "id,title,description,event_name,recognition,achieved_on,evidence_url,display_order,created_at,updated_at"),
    ]);
    const siteData = resolveSiteContent(site.error ? null : site.data?.data);
    const skillsData = (skills.error ? portfolioSnapshot.skills : skills.data || []) as Skill[];
    const projectsData = (projects.error ? portfolioSnapshot.projects : projects.data || []) as Project[];
    return {
      source: [skills, projects, certifications, experiences, achievements].some(result => result.error) ? "snapshot" : "supabase",
      site: siteData,
      categories: includeSkillCategories(categories.error ? fallbackSkillCategories(siteData) : (categories.data || []) as unknown as SkillCategoryRecord[], skillsData, siteData),
      skills: skillsData,
      profileImageUrl: siteData.profile.showPhoto && siteData.profile.photoPath ? supabase.storage.from(projectImageBucket).getPublicUrl(siteData.profile.photoPath).data.publicUrl : null,
      projects: projectsData.map(project => ({ ...project, image_url: project.image_path ? supabase.storage.from(projectImageBucket).getPublicUrl(project.image_path).data.publicUrl : null })),
      certifications: (certifications.error ? portfolioSnapshot.certifications : certifications.data || []) as Certification[],
      experiences: (experiences.error ? portfolioSnapshot.experiences : experiences.data || []) as Experience[],
      achievements: (achievements.error ? portfolioSnapshot.achievements : achievements.data || []) as Achievement[],
    };
  } catch { return portfolioSnapshot; }
}
